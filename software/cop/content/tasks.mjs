// All task data are versioned; execution cases stay on the server.
const basic = [
  [
    "Сумма чисел",
    "Верните сумму чисел из списка. Пустой список даёт 0.",
    "return sum(data)",
    [
      [[], 0],
      [[1, 2, 3], 6],
      [[-2, 4], 2],
    ],
  ],
  [
    "Чётные числа",
    "Верните чётные числа в исходном порядке.",
    "return [x for x in data if x % 2 == 0]",
    [
      [[], []],
      [
        [1, 2, 4, 3],
        [2, 4],
      ],
      [
        [-2, 0],
        [-2, 0],
      ],
    ],
  ],
  [
    "Частоты",
    "Верните словарь частот слов. Регистр значим.",
    "r = {}\n    for x in data:\n        r[x] = r.get(x, 0) + 1\n    return r",
    [
      [[], {}],
      [["a", "b", "a"], { a: 2, b: 1 }],
    ],
  ],
  [
    "Максимум",
    "Верните максимум списка, а для пустого списка — null (None).",
    "return max(data) if data else None",
    [
      [[], null],
      [[3, 1, 2], 3],
      [[-5, -2], -2],
    ],
  ],
  [
    "Безопасное преобразование",
    "Из строк получите целые числа, нечисловые строки пропустите.",
    "r=[]\n    for x in data:\n        try:\n            r.append(int(x))\n        except ValueError:\n            pass\n    return r",
    [
      [
        ["1", "x", "-2"],
        [1, -2],
      ],
      [[], []],
    ],
  ],
  [
    "Среднее",
    "Верните среднее чисел. Для пустого списка — None. Использовать внешние пакеты не требуется.",
    "return sum(data)/len(data) if data else None",
    [
      [[], null],
      [[2, 4], 3],
      [[1, 2, 3], 2],
    ],
  ],
  [
    "Очередь событий",
    'Данные: список команд ["push", число] или ["pop"]. Верните список извлечённых значений; пустой pop даёт None.',
    'from collections import deque\n    q=deque(); out=[]\n    for c in data:\n        if c[0] == "push": q.append(c[1])\n        else: out.append(q.popleft() if q else None)\n    return out',
    [
      [
        [["push", 2], ["pop"], ["pop"]],
        [2, null],
      ],
      [[], []],
    ],
  ],
  [
    "Переносимость алгоритма",
    "Верните список квадратов чисел. В объяснении сопоставьте реализацию на Python с псевдокодом другого языка.",
    "return [x*x for x in data]",
    [
      [
        [1, -2, 0],
        [1, 4, 0],
      ],
      [[], []],
    ],
  ],
  [
    "Состояние объекта",
    "Реализуйте внутренний класс Counter с методом add и свойством value. Верните сумму поступивших приращений.",
    "class Counter:\n        def __init__(self): self.value=0\n        def add(self,x): self.value+=x\n    c=Counter()\n    for x in data: c.add(x)\n    return c.value",
    [
      [[], 0],
      [[2, -1, 3], 4],
    ],
  ],
  [
    "Инкапсуляция стека",
    "Через внутренний класс Stack выполните push/pop и верните значения pop (None для пустого).",
    'class Stack:\n        def __init__(self): self.items=[]\n        def push(self,x): self.items.append(x)\n        def pop(self): return self.items.pop() if self.items else None\n    s=Stack(); out=[]\n    for c in data:\n        if c[0]=="push": s.push(c[1])\n        else: out.append(s.pop())\n    return out',
    [
      [
        [["push", 1], ["push", 2], ["pop"], ["pop"]],
        [2, 1],
      ],
      [[], []],
    ],
  ],
  [
    "Чистая функция",
    "Верните новый отсортированный список без изменения входного. Объясните отсутствие побочных эффектов.",
    "return sorted(data)",
    [
      [
        [3, 1, 2],
        [1, 2, 3],
      ],
      [[], []],
    ],
  ],
  [
    "Композиция преобразований",
    "Оставьте положительные числа, возведите их в квадрат и верните сумму.",
    "return sum(map(lambda x:x*x, filter(lambda x:x>0,data)))",
    [
      [[-2, 1, 3], 10],
      [[], 0],
    ],
  ],
  [
    "Баланс скобок",
    "Для строки из () верните true, если скобки сбалансированы.",
    'n=0\n    for c in data:\n        n += 1 if c=="(" else -1\n        if n<0: return False\n    return n==0',
    [
      ["", true],
      ["(())", true],
      [")(", false],
      ["(()", false],
    ],
  ],
  [
    "Двоичный поиск",
    'Данные: {"values": отсортированный список, "target": число}. Верните индекс первого совпадения, иначе -1. Не используйте index.',
    'a=data["values"]; x=data["target"]; l=0; r=len(a)\n    while l<r:\n        m=(l+r)//2\n        if a[m]<x: l=m+1\n        else: r=m\n    return l if l<len(a) and a[l]==x else -1',
    [
      [{ values: [], target: 1 }, -1],
      [{ values: [1, 2, 2, 5], target: 2 }, 1],
      [{ values: [1, 3], target: 2 }, -1],
    ],
  ],
  [
    "Обход дерева",
    "Дерево задаётся [значение, левое, правое], пустое дерево — None. Верните inorder обход.",
    "def visit(t):\n        return [] if t is None else visit(t[1])+[t[0]]+visit(t[2])\n    return visit(data)",
    [
      [null, []],
      [
        [2, [1, null, null], [3, null, null]],
        [1, 2, 3],
      ],
    ],
  ],
  [
    "Уникальные элементы",
    "Уберите повторы, сохраняя порядок первого появления. Элементы — строки.",
    "return list(dict.fromkeys(data))",
    [
      [[], []],
      [
        ["b", "a", "b", "c"],
        ["b", "a", "c"],
      ],
    ],
  ],
];
const medium = [
  [
    "Префиксные суммы",
    "Верните суммы всех непустых префиксов за один проход.",
    "out=[]; total=0\n    for x in data:\n        total+=x; out.append(total)\n    return out",
    [
      [[], []],
      [
        [1, -2, 4],
        [1, -1, 3],
      ],
    ],
  ],
  [
    "Серии",
    "Сожмите последовательность в пары [значение, длина серии].",
    "out=[]\n    for x in data:\n        if out and out[-1][0]==x: out[-1][1]+=1\n        else: out.append([x,1])\n    return out",
    [
      [
        [1, 1, 2, 1],
        [
          [1, 2],
          [2, 1],
          [1, 1],
        ],
      ],
      [[], []],
    ],
  ],
  [
    "Инвертированный индекс",
    "Для списка строк слов верните слово → список номеров строк (с 0), без повторов номера.",
    "r={}\n    for i,line in enumerate(data):\n        for word in set(line.split()): r.setdefault(word,[]).append(i)\n    return r",
    [
      [["a a b", "b c"], { a: [0], b: [0, 1], c: [1] }],
      [[], {}],
    ],
  ],
  [
    "Мемоизация Фибоначчи",
    "Верните F(n), F(0)=0, F(1)=1. n от 0 до 35. Избегайте экспоненциального повторения вычислений.",
    "a,b=0,1\n    for _ in range(data): a,b=b,a+b\n    return a",
    [
      [0, 0],
      [10, 55],
      [30, 832040],
    ],
  ],
  [
    "Разбор записей",
    "Строки имеют вид ключ=целое. Верните суммы по ключам. Строки без одного = или с неверным числом пропускайте.",
    'out={}\n    for s in data:\n        if s.count("=")!=1: continue\n        k,v=s.split("=")\n        try: out[k]=out.get(k,0)+int(v)\n        except ValueError: pass\n    return out',
    [
      [["a=2", "bad", "a=3", "x=q"], { a: 5 }],
      [[], {}],
    ],
  ],
  [
    "Статистика",
    "Верните {min,max,mean} списка или None для пустого. Разделите вычисление на небольшие функции в объяснении.",
    'return {"min":min(data),"max":max(data),"mean":sum(data)/len(data)} if data else None',
    [
      [[], null],
      [[2, 4], { min: 2, max: 4, mean: 3 }],
    ],
  ],
  [
    "Самые частые",
    "Верните до трёх самых частых строк; при равенстве — по алфавиту.",
    "from collections import Counter\n    c=Counter(data)\n    return sorted(c,key=lambda x:(-c[x],x))[:3]",
    [
      [
        ["b", "a", "b", "c", "a"],
        ["a", "b", "c"],
      ],
      [[], []],
    ],
  ],
  [
    "Контракт сортировки",
    "Отсортируйте пары [ключ, значение] по ключу устойчиво. Опишите, как тот же контракт выразить в другом языке.",
    "return sorted(data,key=lambda x:x[0])",
    [
      [
        [
          [2, "a"],
          [1, "b"],
          [2, "c"],
        ],
        [
          [1, "b"],
          [2, "a"],
          [2, "c"],
        ],
      ],
      [[], []],
    ],
  ],
  [
    "Банковский объект",
    "Внутренний объект Account с балансом 0 обрабатывает deposit/withdraw. Снятие при недостатке средств игнорируется. Верните баланс.",
    'balance=0\n    for op,x in data:\n        if op=="deposit": balance+=x\n        elif balance>=x: balance-=x\n    return balance',
    [
      [
        [
          ["deposit", 10],
          ["withdraw", 12],
          ["withdraw", 3],
        ],
        7,
      ],
      [[], 0],
    ],
  ],
  [
    "Полиморфный расчёт",
    "Для объектов {type: circle, r} или {type: rect, w,h} верните площади (pi=3.141592653589793). Покажите классы и общий метод area.",
    'import math\n    return [math.pi*x["r"]**2 if x["type"]=="circle" else x["w"]*x["h"] for x in data]',
    [
      [[{ type: "rect", w: 2, h: 3 }], [6]],
      [[], []],
    ],
  ],
  [
    "Группировка чистой функцией",
    "Для строк верните словарь: первая буква → строки в исходном порядке. Пустые строки пропустите.",
    "r={}\n    for s in data:\n        if s: r.setdefault(s[0],[]).append(s)\n    return r",
    [
      [["ab", "ax", "b", ""], { a: ["ab", "ax"], b: ["b"] }],
      [[], {}],
    ],
  ],
  [
    "Ленивый конвейер",
    "Верните первые k квадратов чётных неотрицательных чисел. Данные — k от 0 до 100. Используйте генератор.",
    "from itertools import islice,count\n    return list(islice((x*x for x in count(0,2)),data))",
    [
      [0, []],
      [4, [0, 4, 16, 36]],
    ],
  ],
  [
    "Скобки трёх типов",
    "Проверьте баланс (), [], {} в строке. Прочие символы игнорируются.",
    'stack=[]; pairs={")":"(","]":"[","}":"{"}\n    for c in data:\n        if c in "([{": stack.append(c)\n        elif c in pairs:\n            if not stack or stack.pop()!=pairs[c]: return False\n    return not stack',
    [
      ["[a+(b)]", true],
      ["([)]", false],
      ["", true],
    ],
  ],
  [
    "Сортировка слиянием",
    "Реализуйте устойчивую сортировку слиянием списка чисел. Обоснуйте O(n log n).",
    "def sort(a):\n        if len(a)<2: return a[:]\n        m=len(a)//2; l=sort(a[:m]); r=sort(a[m:]); out=[]; i=j=0\n        while i<len(l) and j<len(r):\n            if l[i]<=r[j]: out.append(l[i]); i+=1\n            else: out.append(r[j]); j+=1\n        return out+l[i:]+r[j:]\n    return sort(data)",
    [
      [
        [3, 1, 2, 1],
        [1, 1, 2, 3],
      ],
      [[], []],
    ],
  ],
  [
    "Высота дерева",
    "Верните высоту дерева [значение,левое,правое]. Пустое имеет высоту 0, лист — 1.",
    "def h(t): return 0 if t is None else 1+max(h(t[1]),h(t[2]))\n    return h(data)",
    [
      [null, 0],
      [[2, [1, null, null], null], 2],
    ],
  ],
  [
    "Две суммы",
    "Данные {values,target}. Верните индексы первой пары i<j, найденной при проходе j слева направо, либо None. Используйте хеш-таблицу O(n).",
    'seen={}\n    for j,x in enumerate(data["values"]):\n        y=data["target"]-x\n        if y in seen: return [seen[y],j]\n        seen.setdefault(x,j)\n    return None',
    [
      [{ values: [2, 7, 11], target: 9 }, [0, 1]],
      [{ values: [1, 1], target: 2 }, [0, 1]],
      [{ values: [], target: 1 }, null],
    ],
  ],
];
// Advanced tasks use the same functional contract with stronger algorithmic and experimental demands.
const advanced = medium.map(([title, statement, body, cases], i) => [
  "Исследование: " + title,
  statement +
    " Дополнительно: выдвиньте гипотезу о сложности; сравните собственный вариант с эталоном на граничных данных; предложите контрпример неверному решению и объясните ограничения. В отчёте разделите результаты тестов и доказательство свойств. Не выдавайте один успешный запуск за доказательство.",
  body,
  cases,
]);
advanced[12] = [
  "Стек с минимумом за O(1)",
  "Данные — команды push, pop, min. Верните результаты pop/min; пустой стек даёт None. Докажите амортизированную O(1) и проверьте повторяющиеся минимумы.",
  's=[]; mins=[]; out=[]\n    for c in data:\n        if c[0]=="push":\n            x=c[1]; s.append(x); mins.append(min(x,mins[-1]) if mins else x)\n        elif c[0]=="pop":\n            if s: out.append(s.pop()); mins.pop()\n            else: out.append(None)\n        else: out.append(mins[-1] if mins else None)\n    return out',
  [
    [
      [
        ["push", 3],
        ["push", 1],
        ["push", 1],
        ["pop"],
        ["min"],
        ["pop"],
        ["min"],
      ],
      [1, 1, 1, 3],
    ],
    [
      [["min"], ["pop"]],
      [null, null],
    ],
    [[], []],
  ],
];
advanced[13] = [
  "Подсчёт инверсий",
  "Верните число пар i<j, для которых data[i]>data[j]. Требуется O(n log n). Сравните с квадратичным эталоном на малых входах; равные значения не образуют инверсию.",
  "def count(a):\n        if len(a)<2: return a[:],0\n        m=len(a)//2; l,c1=count(a[:m]); r,c2=count(a[m:]); out=[]; i=j=0; c=c1+c2\n        while i<len(l) and j<len(r):\n            if l[i]<=r[j]: out.append(l[i]); i+=1\n            else: out.append(r[j]); j+=1; c+=len(l)-i\n        return out+l[i:]+r[j:],c\n    return count(data)[1]",
  [
    [[3, 1, 2], 2],
    [[2, 2, 1], 2],
    [[], 0],
    [[4, 3, 2, 1], 6],
  ],
];
advanced[14] = [
  "Глобальный инвариант BST",
  "Дерево: [ключ,левое,правое], пустое — None. Проверьте строгий инвариант дерева поиска без дубликатов на всей глубине. Объясните, почему сравнения только с детьми недостаточно.",
  "def valid(t,lo,hi):\n        if t is None: return True\n        x,l,r=t\n        return (lo is None or x>lo) and (hi is None or x<hi) and valid(l,lo,x) and valid(r,x,hi)\n    return valid(data,None,None)",
  [
    [null, true],
    [[5, [3, null, null], [7, null, null]], true],
    [[5, [3, null, [6, null, null]], null], false],
    [[2, [2, null, null], null], false],
  ],
];
advanced[15] = [
  "LRU-кеш",
  "Данные: {capacity: положительное число, operations: команды [put,key,value] или [get,key]}. Верните результаты get, при отсутствии None. get и put обновляют актуальность. Обоснуйте O(1) и проверьте вытеснение.",
  'from collections import OrderedDict\n    c=OrderedDict(); out=[]\n    for op in data["operations"]:\n        if op[0]=="get":\n            if op[1] in c: c.move_to_end(op[1]); out.append(c[op[1]])\n            else: out.append(None)\n        else:\n            c[op[1]]=op[2]; c.move_to_end(op[1])\n            if len(c)>data["capacity"]: c.popitem(last=False)\n    return out',
  [
    [
      {
        capacity: 2,
        operations: [
          ["put", "a", 1],
          ["put", "b", 2],
          ["get", "a"],
          ["put", "c", 3],
          ["get", "b"],
          ["get", "c"],
        ],
      },
      [1, null, 3],
    ],
    [{ capacity: 1, operations: [] }, []],
  ],
];
export const tasks = basic.flatMap((_, i) =>
  [basic, medium, advanced].map((bank, j) => {
    const [title, statement, body, cases] = bank[i];
    return {
      id: `alg-${String(i + 1).padStart(2, "0")}-l${j + 1}`,
      unit_id: `alg-u${String(i + 1).padStart(2, "0")}`,
      title,
      level: j + 1,
      kind: i === 13 ? "search_lab" : "python",
      statement,
      starter:
        "def solve(data):\n    # Реализуйте контракт задания\n    pass\n",
      reference_code: "def solve(data):\n    " + body + "\n",
      tests: cases.map(([input, expected]) => ({ input, expected })),
      rubric: {
        correctness: 50,
        explanation: 20,
        complexity: 15,
        experiment: 15,
        note: "Кодовые тесты проверяют результат. Использование требуемой структуры, доказательство сложности и самостоятельность проверяет преподаватель.",
      },
    };
  }),
);
