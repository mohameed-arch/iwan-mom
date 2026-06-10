export async function generateMOM(mtg, proj, lang, apiKey) {
  if (!apiKey) throw new Error('No API key set. Click ⚙ to add your Anthropic API key.')

  const isAr = lang === 'ar'
  const attendeeStr = (mtg.attendees || [])
    .map(a => `${a.name} (${a.company}, ${a.role})`)
    .join(isAr ? '، ' : ', ')
  const actionsStr = (mtg.actions || [])
    .map((a, i) => `${i + 1}. ${a.text} — ${a.owner} — ${a.due}`)
    .join('\n')

  const prompt = isAr ? `
أنت مساعد معماري في شركة IWAN Architects. حوّل الملاحظات التالية إلى محضر اجتماع احترافي ومنظم.

المشروع: ${proj.name} | العميل: ${proj.client} | النوع: ${proj.type}
التاريخ: ${mtg.date} | الوقت: ${mtg.time} | الموقع: ${mtg.location}
نوع الاجتماع: ${mtg.mType} | يرأسه: ${mtg.chaired} | المحضر: ${mtg.minsBy}
الحضور: ${attendeeStr}
الأهداف: ${mtg.objectives}
الملاحظات السريعة: ${mtg.notes}
بنود العمل: ${actionsStr}
متفرقات: ${mtg.aob}

أعد JSON فقط، لا نص خارجه، بالشكل التالي:
{
  "summary": "ملخص تنفيذي موجز (2-3 جمل)",
  "objectives": ["هدف 1", "هدف 2", "هدف 3"],
  "discussion": [
    {"topic": "الموضوع", "keyPoints": "النقاط الرئيسية والقرارات بالتفصيل", "remarks": "ملاحظات إضافية"}
  ],
  "actions": [
    {"no": 1, "description": "وصف المهمة بالتفصيل", "owner": "المسؤول", "due": "التاريخ", "status": "مفتوح"}
  ],
  "aob": "نص المتفرقات",
  "nextMeeting": "${mtg.nextMtg || 'يُحدد لاحقاً'}"
}` : `
You are a professional architectural assistant at IWAN Architects.
Convert these raw meeting notes into a polished, detailed Minutes of Meeting.

Project: ${proj.name} | Client: ${proj.client} | Type: ${proj.type}
Date: ${mtg.date} | Time: ${mtg.time} | Location: ${mtg.location}
Meeting Type: ${mtg.mType} | Chaired By: ${mtg.chaired} | Minutes By: ${mtg.minsBy}
Attendees: ${attendeeStr}
Objectives: ${mtg.objectives}
Raw Notes: ${mtg.notes}
Actions: ${actionsStr}
AOB: ${mtg.aob}

Return ONLY valid JSON, no text outside it:
{
  "summary": "Professional executive summary (2-3 sentences)",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "discussion": [
    {"topic": "Topic heading", "keyPoints": "Detailed key points and decisions made", "remarks": "Any remarks"}
  ],
  "actions": [
    {"no": 1, "description": "Detailed action description", "owner": "Owner name", "due": "Date string", "status": "Open"}
  ],
  "aob": "Any other business text",
  "nextMeeting": "${mtg.nextMtg || 'To be confirmed'}"
}`

  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const txt = data.content?.find(b => b.type === 'text')?.text || ''
  const match = txt.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  return JSON.parse(match[0])
}
