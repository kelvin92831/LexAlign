import axios from 'axios';

const API_URL = 'http://localhost:3001';

console.log('🔍 LexAlign 前後端連接測試\n');
console.log('━'.repeat(50));

async function testHealthCheck() {
  console.log('\n📡 測試 1: 健康檢查端點');
  console.log(`   請求: GET ${API_URL}/health`);
  
  try {
    const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    console.log('   ✅ 成功！');
    console.log('   響應:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('   ❌ 失敗！');
    if (error.code === 'ECONNREFUSED') {
      console.log('   錯誤: 無法連接到後端服務');
      console.log('   提示: 請確認後端是否運行在 3001 端口');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   錯誤: 請求超時');
      console.log('   提示: 檢查網路連接和防火牆設置');
    } else {
      console.log('   錯誤:', error.message);
    }
    return false;
  }
}

async function testPolicyCheck() {
  console.log('\n📂 測試 2: 內規資料夾檢查');
  console.log(`   請求: GET ${API_URL}/api/upload/policy/check`);
  
  try {
    const response = await axios.get(`${API_URL}/api/upload/policy/check`, { timeout: 5000 });
    console.log('   ✅ 成功！');
    console.log('   資料夾狀態:', response.data.data.exists ? '存在' : '不存在');
    console.log('   文件數量:', response.data.data.fileCount || 0);
    return true;
  } catch (error) {
    console.log('   ❌ 失敗！');
    console.log('   錯誤:', error.message);
    return false;
  }
}

async function testCORS() {
  console.log('\n🔐 測試 3: CORS 設定');
  
  try {
    const response = await axios.get(`${API_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    if (response.headers['access-control-allow-origin']) {
      console.log('   ✅ CORS 已正確配置');
      console.log('   允許的來源:', response.headers['access-control-allow-origin']);
    } else {
      console.log('   ⚠️  未檢測到 CORS 標頭');
    }
    return true;
  } catch (error) {
    console.log('   ❌ CORS 測試失敗');
    console.log('   錯誤:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = [];
  
  results.push(await testHealthCheck());
  results.push(await testPolicyCheck());
  results.push(await testCORS());
  
  console.log('\n' + '━'.repeat(50));
  console.log('\n📊 測試總結:');
  console.log(`   通過: ${results.filter(r => r).length}/${results.length}`);
  
  if (results.every(r => r)) {
    console.log('\n✨ 恭喜！所有測試通過，前後端連接正常！');
    console.log('   你現在可以啟動前端開始使用了：');
    console.log('   npm run dev\n');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查：');
    console.log('   1. 後端服務是否運行 (npm start)');
    console.log('   2. 後端運行在 3001 端口');
    console.log('   3. 防火牆是否允許連接');
    console.log('   4. data/internal_rules 資料夾是否存在\n');
  }
  
  console.log('詳細說明請查看: CONNECTION_TEST.md\n');
}

runAllTests();
