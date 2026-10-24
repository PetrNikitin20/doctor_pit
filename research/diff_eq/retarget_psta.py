from pathlib import Path
import json, re, ast, shutil, hashlib, sys

import argparse, os
parser=argparse.ArgumentParser()
parser.add_argument('--template-root',type=Path)
parser.add_argument('--output',type=Path)
args=parser.parse_args()
BASE=Path(__file__).resolve().parent
OLD=BASE
TEMPLATE=args.template_root or BASE/'psta'
OUT=args.output or BASE/'psta'
OUT.mkdir(parents=True,exist_ok=True)
DATA = json.loads((OLD / 'manuscript_tusur.json').read_text(encoding='utf-8'))
constants = {}
for node in ast.parse((OLD / 'retarget_tusur.py').read_text(encoding='utf-8')).body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in ['REFS', 'WRAPPED']:
        constants[node.targets[0].id] = ast.literal_eval(node.value)

SUB = str.maketrans('₀₁₂₃₄₅₆₇₈₉ᵢⱼₖₛₜₘₙ', '0123456789ijkstmn')
SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺', '0123456789-+')
GREEK = {
    'α': r'\alpha', 'β': r'\beta', 'γ': r'\gamma', 'δ': r'\delta',
    'ε': r'\varepsilon', 'ζ': r'\zeta', 'η': r'\eta', 'θ': r'\theta',
    'κ': r'\kappa', 'λ': r'\lambda', 'μ': r'\mu', 'ν': r'\nu',
    'π': r'\pi', 'ρ': r'\rho', 'σ': r'\sigma', 'τ': r'\tau',
    'φ': r'\varphi', 'χ': r'\chi', 'ψ': r'\psi', 'ω': r'\omega',
    'Θ': r'\Theta', 'Σ': r'\Sigma', 'Δ': r'\Delta',
    'ℝ': r'\mathbb{R}', 'ℓ': r'\ell'
}
ALLG = ''.join(GREEK)

def math(s):
    for a, b in GREEK.items():
        s = s.replace(a, b + ' ')
    return s

def esc(s):
    s = str(s).replace('—', '–').replace('\u00a0', ' ').replace('σmin', 'σₘᵢₙ').replace('ż','z\u0307')
    s = re.sub(r'(?<=\d);(?=\d)', '; ', s)
    stored = []
    def keep(t):
        stored.append(t)
        return 'ZZMATH' + str(len(stored)-1) + 'ZZ'
    s = s.replace('Jα,β', keep(r'$J_{\alpha,\beta}$'))
    s = s.replace('∫₀ᵗ', keep(r'$\int_0^t$'))
    s = re.sub(r'([A-Za-z])_([A-Za-z0-9]+)', lambda m: keep('$'+m[1]+'_{'+m[2]+'}$'), s)
    s = re.sub(r'([A-Za-z])\u0307([₀₁₂₃₄₅₆₇₈₉]+)', lambda m: keep(r'$\dot{'+m[1]+'}_{'+m[2].translate(SUB)+'}$'),s)
    def token(m):
        base, subs = m.group(1), m.group(2)
        sub = subs.translate(SUB)
        if sub == 'min':
            sub = r'\min'
        return keep('$' + GREEK.get(base, base) + '_{' + sub + '}$')
    s = re.sub(r'([A-Za-z' + ALLG + r'])([₀₁₂₃₄₅₆₇₈₉ᵢⱼₖₛₜₘₙ]+)', token, s)
    s = re.sub(
        r'([A-Za-z' + ALLG + r'])([\u0303\u0302])',
        lambda m: keep('$' + (r'\widetilde' if m[2] == '\u0303' else r'\widehat') + '{' + GREEK.get(m[1], m[1]) + '}$'), s
    )
    s = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+', lambda m: keep('$^{' + m[0].translate(SUP) + '}$'), s)
    s = re.sub(r'[ᵏᵗ]+', lambda m: keep('$^{'+m[0].replace('ᵏ','k').replace('ᵗ','t')+'}$'),s)
    s = re.sub(r'[₀₁₂₃₄₅₆₇₈₉]+', lambda m: keep('$_{'+m[0].translate(SUB)+'}$'),s)
    s = re.sub('[' + ALLG + ']', lambda m: keep('$' + GREEK[m[0]] + '$'), s)
    replacements = {
        '≤': r'$\le$', '≥': r'$\ge$', '∈': r'$\in$', '≠': r'$\ne$',
        '∂': r'$\partial$', '∞': r'$\infty$', '×': r'$\times$',
        '·': r'$\cdot$', '−': r'$-$', '²': r'$^2$', '³': r'$^3$',
        '∥': r'$\Vert$', 'ℬ': r'$\mathcal{B}$',
        '→': r'$\to$', '↦': r'$\mapsto$', '∫':r'$\int$'
    }
    for a, b in replacements.items():
        if a in s:
            s = s.replace(a, keep(b))
    s = s.replace('\\', r'\textbackslash{}')
    for a, b in [('&', r'\&'), ('%', r'\%'), ('#', r'\#'), ('_', r'\_'), ('{', r'\{'), ('}', r'\}')]:
        s = s.replace(a, b)
    for i, value in enumerate(stored):
        s = s.replace('ZZMATH' + str(i) + 'ZZ', value)
    return s

for rel in ['psta.cls', 'psta']:
    src, dst = TEMPLATE / rel, OUT / rel
    if src.resolve()==dst.resolve():
        continue
    if src.is_dir():
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        shutil.copy2(src, dst)
(OUT / 'figures').mkdir(exist_ok=True)

# Same data as the previous edition, rendered as a vector figure.
if os.environ.get('RESEARCH_DEPS'):
    sys.path.insert(0,os.environ['RESEARCH_DEPS'])
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
r = json.loads((OLD / 'results.json').read_text(encoding='utf-8'))
plt.rcParams.update({
    'font.family': 'DejaVu Serif', 'font.size': 10,
    'axes.spines.top': False, 'axes.spines.right': False,
    'pdf.fonttype': 42, 'ps.fonttype': 42
})
fig, ax = plt.subplots(2, 1, figsize=(4.45, 5.5), layout='constrained')
for mode, style in [('M', 'o-'), ('A', 's--')]:
    rows = [x for x in r['conditioning'] if x['mode'] == mode]
    ax[0].loglog(
        [x['h'] for x in rows], [x['rest_sigma_min'] for x in rows], style,
        color='black', markerfacecolor='white' if mode == 'A' else 'black',
        label=mode, linewidth=1, markersize=4
    )
ax[0].set_xlabel(r'Интервал $h$')
ax[0].set_ylabel('Наименьшее сингулярное число')
ax[0].set_title('а  Калибровка первого компонента', fontsize=10)
ax[0].legend(frameon=False, title='Режим')
rows = r['transfer_excitation']
ax[1].loglog([x['lambda1'] for x in rows], [x['sigma_min'] for x in rows],
             'o-', color='black', linewidth=1, markersize=4)
ax[1].set_xlabel(r'Коэффициент забывания $\lambda_1$')
ax[1].set_ylabel('Наименьшее сингулярное число')
ax[1].set_title('б  Разделение освоения и переноса', fontsize=10)
for a in ax:
    a.grid(True, which='major', color='.8', linewidth=.5)
fig.savefig(OUT / 'figures/conditioning.pdf',
            metadata={'Title': 'Calibration and transfer conditioning', 'Author': '', 'Creator': 'Matplotlib'})
fig.savefig(OUT / 'figures/conditioning.png', dpi=300)
fig.savefig(OUT / 'figures/conditioning.svg')
plt.close(fig)

abstract_ru = (
    'Рассматривается двухкомпонентная нелинейная модель междисциплинарной подготовки, '
    'учитывающая освоение, забывание, направленный перенос и внешнюю поддержку при выполнении заданий. '
    'Для девяти неизвестных параметров, включая начальные состояния и характеристики помощи, '
    'построен конечный протокол наблюдений. Для смешанного и полностью поддерживаемого режимов '
    'калибровки доказаны глобальная однозначность восстановления на образе модели, невырожденность '
    'якобиана отображения наблюдений и локальная устойчивость обратного отображения. Численный '
    'алгоритм сочетает явную калибровку, одномерное обращение и решение ограниченной задачи по двум '
    'параметрам освоения и переноса. Воспроизводимый эксперимент включает 80 синтетических восстановлений '
    'и 180000 повторений биномиальной калибровки. Исследовано ухудшение обусловленности при '
    'коротких интервалах наблюдения и почти постоянном состоянии предпосылки. Результаты задают '
    'требования к диагностическому протоколу и программному модулю идентификации. Девять точных '
    'вероятностей не отождествляются с девятью ответами одного обучающегося; применимость модели '
    'к реальным учебным событиям требует отдельной проверки.'
)
abstract_en = (
    'A two-component nonlinear model of interdisciplinary learning is considered, incorporating '
    'acquisition, forgetting, directed transfer, and external assistance in task completion. '
    'A finite observation protocol is constructed for nine unknown parameters, including initial '
    'states and assistance characteristics. For mixed and fully assisted calibration modes, global '
    'uniqueness of recovery on the model image, nonsingularity of the observation Jacobian, and local '
    'stability of the inverse map are established. The numerical algorithm combines explicit '
    'calibration, scalar inversion, and a constrained two-parameter acquisition-and-transfer fit. The reproducible '
    'experiment includes 80 synthetic recovery cases and 180000 binomial calibration replicates. '
    'The deterioration of conditioning with short observation intervals and an almost constant '
    'prerequisite state is examined. The results specify requirements for a diagnostic protocol and '
    'a software identification module. Nine exact probabilities do not represent nine responses '
    'from an individual learner; application to actual learning events requires separate validation.'
)

preamble = r'''% Official PSTA class downloaded 2026-10-24. Compile three times with pdflatex.
% The blind option suppresses identifying metadata in the review PDF.
\documentclass[blind]{psta}
\makeatletter
% Compatibility for the publisher's blind-mode placeholder; psta.cls is unchanged.
\providecommand{\HideFromPeer@}[1]{#1}
\makeatother
\usepackage{graphicx}
\usepackage{placeins}
\subjclass[UDC]{519.876.5}
\subjclass[2020]{93B30; 34A55, 65L09}
\JournalRubric{6}
\ArticleType{RAR}
\setlength{\emergencystretch}{2em}
\hfuzz=0.5pt
\hypersetup{pdfauthor={},pdfsubject={Finite-observation identification of a learning ODE},pdfkeywords={identifiability; learning dynamics; external assistance}}
\Russian
'''
authors = r'''% Identifying information is compiled out by the official blind option.
\author{Никитин, Пётр Владимирович}
\address{Финансовый университет при Правительстве Российской Федерации, Москва, Россия}
\email{pvnikitin@fa.ru}
\orcid{0000-0001-8866-5610}
\correspondent
\info{Кандидат педагогических наук, доцент кафедры искусственного интеллекта. Научные интересы: математическое моделирование образовательных процессов, программные системы поддержки обучения, междисциплинарная подготовка и применение искусственного интеллекта.}
'''
parts = [
    preamble, r'\title[Идентификация модели подготовки]{' + esc(DATA['title']) + '}',
    authors, r'\begin{abstract}', esc(abstract_ru), r'\end{abstract}',
    r'\keywords{' + esc(DATA['keywords']) + '}', r'\English',
    r'\title[Identifying a dynamic learning model]{' + esc(DATA['title_en']) + '}',
    r'\author{Nikitin, Petr Vladimirovich}',
    r'\address{Financial University under the Government of the Russian Federation, Moscow, Russia}',
    r'\info{Candidate of Pedagogical Sciences, Associate Professor at the Department of Artificial Intelligence. Research interests include mathematical modelling of educational processes, learning support software, interdisciplinary learning, and artificial intelligence.}',
    r'\begin{abstract}', esc(abstract_en), r'\end{abstract}',
    r'\keywords{' + esc(DATA['keywords_en']) + '}',
    r'\begin{document}', r'\raggedbottom', r'\Russian', r'\maketitle',
    r'\pstamarkboth{Рукопись для рецензирования}{Идентификация модели подготовки}'
]
math_count = 0
eqnos = {int(k): v for k, v in DATA['numbered_equations'].items()}
for index, (kind, value) in enumerate(DATA['blocks']):
    if kind == 'h':
        parts.append(r'\FloatBarrier')
        parts.append((r'\section*{' if value in ['Введение', 'Заключение'] else r'\section{') + esc(value) + '}')
    elif kind == 'p':
        text = esc(value)
        text = re.sub(
            r'\[([0-9]+(?:\s*,\s*[0-9]+)*)\]',
            lambda m: r'\cite{' + ','.join('ref' + n.strip() for n in m[1].split(',')) + '}', text
        )
        parts.append(text + '\n')
    elif kind == 's':
        parts.append(r'\par\medskip\noindent\textbf{' + esc(value) + r'}\par\smallskip')
    elif kind == 'e':
        math_count += 1
        value = constants['WRAPPED'].get(math_count, value) if len(value) > 88 else value
        if math_count in eqnos:
            n = str(eqnos[math_count])
            parts.extend([r'\begin{equation}', math(value), r'\tag{' + n + '}',
                          r'\label{eq:' + n + '}', r'\end{equation}'])
        else:
            parts.extend([r'\[', math(value), r'\]'])
    elif kind == 't':
        caption = re.sub(r'^Таблица \d+\.\s*', '', value['caption'])
        spec = (r'|p{.20\linewidth}|p{.22\linewidth}|p{.47\linewidth}|'
                if len(value['heads']) == 3 else r'|c|c|p{.24\linewidth}|p{.30\linewidth}|')
        parts.extend([
            r'\begin{table}[htbp]', r'\caption{' + esc(caption) + '}',
            r'\label{tab:' + str(index) + '}', r'\centering\small',
            r'\renewcommand{\arraystretch}{1.25}', r'\setlength{\tabcolsep}{3pt}',
            r'\begin{tabular}{' + spec + '}', r'\hline',
            ' & '.join(r'\textbf{' + esc(x) + '}' for x in value['heads']) + r'\\\hline'
        ])
        for row in value['rows']:
            parts.append(' & '.join(esc(x) for x in row) + r'\\\hline')
        parts.extend([r'\end{tabular}', r'\end{table}'])
    elif kind == 'f':
        parts.extend([
            r'\begin{figure}[htbp]', r'\centering',
            r'\includegraphics[width=.98\linewidth]{figures/conditioning.pdf}',
            r'\caption{Обусловленность калибровки и идентификации переноса}',
            r'\label{fig:conditioning}', r'\end{figure}'
        ])
    else:
        raise ValueError(kind)
parts.extend([r'\FloatBarrier', r'\begin{thebibliography}{99}'])
for number, row in enumerate(constants['REFS'], 1):
    old, author_list, title, journal, year, vol, issue, pages, doi = row
    parts.extend([
        r'\Bibitem{ref' + str(number) + '}',
        r'\by ' + esc(', '.join(s + ' ' + ini for s, ini in author_list) + (' et al.' if old == 9 else '')),
        r'\paper ' + esc(title)
    ])
    if old == 6:
        parts.extend([r'\miscnote Preprint, version 3, 15 October 2026',
                      r'\yr 2026', r'\arxiv 2610.09889v3'])
    else:
        parts.extend([r'\jour ' + esc(journal), r'\yr ' + str(year), r'\vol ' + esc(vol)])
        if issue:
            parts.append(r'\issue ' + esc(issue))
        if pages.startswith('Art.'):
            parts.append(r'\miscnote ' + esc(pages))
        else:
            parts.append(r'\pages ' + esc(pages).replace('–', '--'))
    if doi:
        parts.append(r'\doi ' + doi)
    else:
        parts.append(r'\url https://jmlr.org/papers/v25/22-1159.html')
    parts.append('')
parts.extend([r'\end{thebibliography}', r'\makefinish', r'\English', r'\maketitle', r'\end{document}'])
tex = '\n'.join(parts) + '\n'
assert math_count == 22
assert '—' not in tex
(OUT / 'article.tex').write_text(tex, encoding='utf-8')
(OUT / 'abstracts.json').write_text(json.dumps({'ru': abstract_ru, 'en': abstract_en}, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT / 'build.ps1').write_text(
    "$ErrorActionPreference = 'Stop'\nPush-Location $PSScriptRoot\ntry {\n"
    "    pdflatex -interaction=nonstopmode -halt-on-error article.tex\n"
    "    if ($LASTEXITCODE -ne 0) { throw 'First pdflatex pass failed' }\n"
    "    pdflatex -interaction=nonstopmode -halt-on-error article.tex\n"
    "    if ($LASTEXITCODE -ne 0) { throw 'Second pdflatex pass failed' }\n"
    "    pdflatex -interaction=nonstopmode -halt-on-error article.tex\n"
    "    if ($LASTEXITCODE -ne 0) { throw 'Third pdflatex pass failed' }\n"
    "} finally { Pop-Location }\n", encoding='utf-8'
)
(OUT / 'README.md').write_text(
    '# Исходники статьи для журнала Программные системы теория и приложения\n\n'
    'Редакция от 24 октября 2026 года. Рубрика 6 «Математическое моделирование», специальность 1.2.2, технические науки.\n\n'
    'article.tex использует официальный класс psta.cls с опцией blind. Она скрывает сведения об авторе в PDF; '
    'исходный TeX содержит авторские метаданные для редакции. Класс и каталог psta загружены из '
    'https://psta.psiras.ru/publ-conditions/psta.zip без изменений. Это издательские файлы.\n\n'
    'В преамбуле определен отсутствующий в классе макрос HideFromPeer@ для анонимного режима; '
    'колонтитулы заменены нейтральными через pstamarkboth. Класс не редактировался. '
    'raggedbottom предотвращает растяжение последней страницы библиографии.\n\n'
    'Сборка: три запуска pdflatex -interaction=nonstopmode -halt-on-error article.tex в этом каталоге. '
    'В Windows можно запустить build.ps1 при доступном pdflatex.\n\n'
    'До рецензирования отправляется анонимный PDF. Персональные сведения передаются в сопроводительном письме. '
    'Для публикационной версии автор предоставляет фотографию. Авторская справка заверяется по месту работы. '
    'Теоретический результат и расчетные JSON/CSV сохранены из предыдущей редакции; '
    'рисунок пересобран в векторном формате на тех же числах.\n\n'
    'Это альтернативное оформление той же работы, ранее подготовленной для ИТВС и ТУСУР, а не новая публикация. '
    'Материалы не обозначаются как принятые или опубликованные в этих журналах.\n', encoding='utf-8'
)
manifest = {
    'source': 'manuscript_tusur.json',
    'source_sha256': hashlib.sha256((OLD/'manuscript_tusur.json').read_bytes()).hexdigest(),
    'display_equations': 22, 'numbered_equations': eqnos, 'tables': 3, 'figures': 1, 'references': 15,
    'rubric': 6, 'specialty': '1.2.2 (technical sciences)', 'date': '2026-10-24', 'anonymous': True,
    'class_sha256': hashlib.sha256((OUT/'psta.cls').read_bytes()).hexdigest()
}
(OUT / 'source_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('SOURCE', OUT, 'equations', math_count, 'abstract words', len(abstract_ru.split()), len(abstract_en.split()))
