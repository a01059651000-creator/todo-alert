const https = require('https');

const SUPABASE_URL = 'nhyehgknkwwhebtprwzo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const now = new Date().toISOString();
  
  // 알림 시간 된 것 가져오기
  const todos = await request({
    hostname: SUPABASE_URL,
    path: `/rest/v1/todos_alert?sent=eq.false&alert_time=lte.${now}&select=*`,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  console.log(`체크: ${todos.length}개 알림 발견`);

  for (const todo of todos) {
    // 텔레그램 발송
    const msg = `⏰ 할일 알림!\n\n📌 ${todo.name}\n📝 ${todo.content || ''}\n🕐 ${new Date(todo.todo_time).toLocaleString('ko-KR')}`;
    
    await request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }));

    // sent = true 로 업데이트
    await request({
      hostname: SUPABASE_URL,
      path: `/rest/v1/todos_alert?id=eq.${todo.id}`,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ sent: true }));

    console.log(`발송 완료: ${todo.name}`);
  }
}

main().catch(console.error);
