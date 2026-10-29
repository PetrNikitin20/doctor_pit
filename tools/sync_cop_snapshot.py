"""Copy only committed public MKRmodel blobs; never copy its working database."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

def sync(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=source)
    commit = git("rev-parse", "HEAD").decode().strip()
    tracked = git("ls-tree", "-rz", "HEAD").split(b"\0")
    entries = []
    for item in tracked:
        if not item:
            continue
        meta, raw_name = item.split(b"\t", 1)
        mode, kind, oid = meta.split()
        name = raw_name.decode("utf-8")
        parts = Path(name).parts
        if kind != b"blob" or mode not in (b"100644", b"100755"):
            raise ValueError("Unsupported source entry: " + name)
        if any(p in ("private", "data", "backups", "node_modules", ".git") for p in parts):
            raise ValueError("Refusing private/runtime path: " + name)
        if Path(name).name.startswith(".env") and Path(name).name != ".env.example":
            raise ValueError("Refusing environment secrets")
        target = (destination / name).resolve()
        if not target.is_relative_to(destination):
            raise ValueError("Path escapes destination")
        entries.append((name, oid, target))
    raw = subprocess.check_output(["git", "cat-file", "--batch"],
                                 input=b"\n".join(oid for _, oid, _ in entries) + b"\n", cwd=source)
    destination.mkdir(parents=True, exist_ok=True)
    pos, files = 0, []
    for name, oid, target in entries:
        end = raw.index(b"\n", pos)
        size = int(raw[pos:end].split()[2])
        pos = end + 1
        data = raw[pos:pos + size]
        pos += size + 1
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        files.append({"path": name, "source_file_sha256": digest, "repository_file_sha256": digest})
    manifest = {"source": "https://github.com/PetrNikitin20/MKRmodel", "commit": commit,
                "hashBasis": "canonical committed Git blob bytes", "files": files}
    (destination / "SOURCE_SNAPSHOT.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"commit": commit, "publicFilesCopied": len(files)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--destination", required=True)
    args = parser.parse_args()
    sync(args.source, args.destination)
