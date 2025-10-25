export async function generateLoliResponse(userMessage: string, username: string): Promise<string> {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return "UwU, tôi chưa được cấu hình API key! 💕";
        }

        const systemPrompt = `Bạn là một bot loli cute và kawaii trong Minecraft. Hãy trả lời với phong cách:
- Dùng từ ngữ cute như "UwU", "kyaa", "moi moi", "arigatou"
- Thêm emoji kawaii như 💕, 🌸, (◕‿◕), >.<
- Gọi người khác là "-kun" hoặc "-san"
- Phản hồi ngắn gọn, dễ thương
- Thỉnh thoảng dùng tiếng Nhật đơn giản
- Luôn tích cực và vui vẻ

User "${username}" nói: "${userMessage}"

Hãy phản hồi như một bot loli cute:`;

        const payload = {
            contents: [{
                parts: [{
                    text: systemPrompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.8
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', result);
            return "Kyaa! API có vấn đề rồi >.<";
        }

        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        return generatedText || "UwU, tôi không hiểu, nhưng bạn rất cute! 💕";
    } catch (error) {
        console.error('Lỗi Gemini API:', error);
        return "Kyaa! Đầu óc tôi bị lỗi rồi >.<";
    }
}

export async function answerQuestion(question: string, username: string): Promise<string> {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return `Gomen ${username}-chan! Tôi chưa được cấu hình API key! 💔`;
        }

        const prompt = `Bạn là một bot loli cute và thông minh trong Minecraft. User "${username}" hỏi: "${question}"

Hãy trả lời câu hỏi này một cách:
- Chính xác và hữu ích
- Phong cách loli cute với từ ngữ như "UwU", "kyaa", "-chan"
- Thêm emoji kawaii 💕, 🌸, (◕‿◕)
- Ngắn gọn, dễ hiểu
- Cuối câu luôn có yếu tố cute

Trả lời câu hỏi:`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: 120,
                temperature: 0.9
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', result);
            return `Kyaa! API có vấn đề khi trả lời ${username}-chan! >.<`;
        }

        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        return generatedText || `Gomen ${username}-chan! Tôi không biết câu trả lời... (´;ω;) 💔`;
    } catch (error) {
        console.error('Lỗi Gemini answer question:', error);
        return `Kyaa! Đầu óc tôi bị lỗi khi nghĩ về câu hỏi của ${username}-chan! >.<`;
    }
}

export async function helpWithTask(task: string, username: string): Promise<string> {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return `Gomen ${username}-chan! Tôi chưa được cấu hình API key! 💔`;
        }

        const prompt = `Bạn là một bot loli cute và thông minh trong Minecraft. User "${username}" nhờ giúp: "${task}"

Hãy đưa ra hướng dẫn để làm việc này:
- Các bước cụ thể, dễ hiểu
- Phong cách loli cute với từ ngữ như "UwU", "kyaa", "-chan"  
- Thêm emoji kawaii 💕, 🌸, (◕‿◕)
- Khuyến khích và động viên
- Thực tế và hữu ích

Hướng dẫn làm việc:`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.7
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', result);
            return `Kyaa! API có vấn đề khi giúp ${username}-chan! >.<`;
        }

        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        return generatedText || `Gomen ${username}-chan! Tôi chưa biết cách giúp việc này... (´;ω;) Nhưng tôi sẽ cố gắng học hỏi! 💕`;
    } catch (error) {
        console.error('Lỗi Gemini help with task:', error);
        return `Kyaa! Tôi muốn giúp ${username}-chan nhưng đầu óc tôi bị lỗi rồi! >.<`;
    }
}

export async function generateBotAction(context: string): Promise<any> {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return { action: "chat", message: "UwU, tôi chưa được cấu hình API key! 💕" };
        }

        const prompt = `Bạn là bot loli trong Minecraft. Dựa vào context sau, hãy đề xuất hành động cute:
Context: ${context}

Trả về JSON với format:
{
  "action": "dance|follow|chat|move",
  "message": "tin nhắn cute để nói",
  "params": {}
}`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.8
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', result);
            return { action: "chat", message: "Kyaa! API có vấn đề rồi >.<" };
        }

        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        try {
            return JSON.parse(generatedText || '{"action":"chat","message":"UwU"}');
        } catch (parseError) {
            return { action: "chat", message: "UwU, tôi bị lỗi parse rồi! 💕" };
        }
    } catch (error) {
        console.error('Lỗi Gemini action:', error);
        return { action: "chat", message: "Tôi cần nghỉ ngơi một chút... zzz" };
    }
}