import dotenv from 'dotenv';
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 모델은 고정값으로 설정
const MODEL_NAME = "gpt-4o-mini";

async function callGPT(system, user) {
  try {
    const res = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.7
    });

    return res.choices[0].message.content;

  } catch (error) {
    console.error("GPT 호출 오류:", error.message);
    throw new Error("GPT 응답을 가져오는 데 실패했습니다.");
  }
}

export { callGPT };
