export async function generateCode({ statement, consent }) {
  const provider = process.env.LLM_PROVIDER || "disabled";
  if (provider === "disabled")
    return {
      disabled: true,
      message: "LLM отключена. Доступно сравнение с методическим эталоном.",
    };
  if (!consent)
    throw Object.assign(
      new Error("Для запроса LLM требуется отдельное согласие"),
      { status: 400 },
    );
  if (!["ollama", "openai_compatible"].includes(provider))
    throw new Error("Неизвестный LLM_PROVIDER");
  const base = process.env.LLM_BASE_URL,
    model = process.env.LLM_MODEL;
  if (!base || !model) throw new Error("LLM не настроена");
  // Only the public task statement is transmitted. User code, identity and marks are excluded.
  const prompt =
    "Учебный пример Python. Напиши функцию solve(data) по условию. Дай только код.\n" +
    statement;
  const response = await fetch(base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.LLM_API_KEY
        ? { Authorization: "Bearer " + process.env.LLM_API_KEY }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw Object.assign(
      new Error("LLM временно недоступна; работа сохранена"),
      { status: 503 },
    );
  const result = await response.json(),
    code = result.choices?.[0]?.message?.content;
  if (typeof code !== "string" || code.length > 16000)
    throw new Error("Неверный ответ LLM");
  return { provider, model, code, prompt };
}
