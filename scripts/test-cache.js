// scripts/test-cache.js
// Script để test sự khác biệt giữa cache và DB

const axios = require("axios");
require("dotenv").config();

const BASE_URL = process.env.API_URL || "http://localhost:5000/api";
const AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGUwZjhkNTExM2E2NmM1NDBkMjI2ZTciLCJ1c2VybmFtZSI6ImN1c3RvbWVyMSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc2MjkyMzk4MywiZXhwIjoxNzYyOTI3NTgzfQ.9y7XvthDDc_waU-6HiegcJ-LtFEtXEi7fKcVm_65VVw" ||
  ""; // Cần token để test

// Helper function để đo thời gian
async function measureTime(fn, label) {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  const duration = end - start;
  console.log(`⏱️  ${label}: ${duration}ms`);
  return { result, duration };
}

// Test 1: So sánh thời gian response (Cache vs DB)
async function testResponseTime() {
  console.log("\n📊 TEST 1: So sánh thời gian response (Cache vs DB)");
  console.log("=".repeat(60));

  const endpoint = `${BASE_URL}/vehicle/get`; // Get vehicle models
  const headers = { Authorization: `Bearer ${AUTH_TOKEN}` };

  // Request 1: Cache MISS (query DB)
  console.log("\n🔄 Request 1: Cache MISS (sẽ query DB)");
  const { duration: time1 } = await measureTime(
    () => axios.get(endpoint, { headers }),
    "Cache MISS"
  );

  // Request 2: Cache HIT (lấy từ Redis)
  console.log("\n⚡ Request 2: Cache HIT (lấy từ Redis)");
  const { duration: time2 } = await measureTime(
    () => axios.get(endpoint, { headers }),
    "Cache HIT"
  );

  // Request 3: Cache HIT lần 2
  console.log("\n⚡ Request 3: Cache HIT lần 2");
  const { duration: time3 } = await measureTime(
    () => axios.get(endpoint, { headers }),
    "Cache HIT"
  );

  const avgCacheTime = (time2 + time3) / 2;
  const improvement = (((time1 - avgCacheTime) / time1) * 100).toFixed(2);

  console.log("\n📈 Kết quả:");
  console.log(`   DB Query:     ${time1}ms`);
  console.log(`   Cache (avg):  ${avgCacheTime.toFixed(2)}ms`);
  console.log(`   Cải thiện:    ${improvement}% nhanh hơn`);
}

// Test 2: Test cache invalidation
async function testCacheInvalidation() {
  console.log("\n\n🔄 TEST 2: Test Cache Invalidation");
  console.log("=".repeat(60));

  const getEndpoint = `${BASE_URL}/vehicle/get`;
  const createEndpoint = `${BASE_URL}/vehicle/createModel`;
  const headers = { Authorization: `Bearer ${AUTH_TOKEN}` };

  // Step 1: Get data (sẽ cache)
  console.log("\n1️⃣  GET data lần đầu (sẽ cache)");
  const { result: data1 } = await measureTime(
    () => axios.get(getEndpoint, { headers }),
    "GET (cache)"
  );
  const count1 = data1.data?.data?.length || 0;
  console.log(`   Số lượng models: ${count1}`);

  // Step 2: Tạo model mới
  console.log("\n2️⃣  Tạo model mới (sẽ invalidate cache)");
  const newModel = {
    brand: "Test Brand",
    model_name: `Test Model ${Date.now()}`,
    year: 2024,
    battery_type: "Lithium-ion",
  };
  await measureTime(
    () => axios.post(createEndpoint, newModel, { headers }),
    "POST (create)"
  );

  // Step 3: Get lại (sẽ query DB vì cache đã bị xóa)
  console.log("\n3️⃣  GET lại sau khi tạo (cache đã bị xóa, sẽ query DB)");
  const { result: data2 } = await measureTime(
    () => axios.get(getEndpoint, { headers }),
    "GET (after create)"
  );
  const count2 = data2.data?.data?.length || 0;
  console.log(`   Số lượng models: ${count2}`);

  if (count2 > count1) {
    console.log("   ✅ PASS: Data mới đã được thêm vào");
  } else {
    console.log("   ❌ FAIL: Data mới chưa xuất hiện");
  }
}

// Test 3: Test concurrent requests
async function testConcurrentRequests() {
  console.log("\n\n🚀 TEST 3: Test Concurrent Requests");
  console.log("=".repeat(60));

  const endpoint = `${BASE_URL}/vehicle/get`;
  const headers = { Authorization: `Bearer ${AUTH_TOKEN}` };

  console.log("\n🔄 Gửi 10 requests đồng thời...");
  const start = Date.now();
  const promises = Array.from({ length: 10 }, () =>
    axios.get(endpoint, { headers })
  );
  await Promise.all(promises);
  const totalTime = Date.now() - start;

  console.log(`\n⏱️  Tổng thời gian: ${totalTime}ms`);
  console.log(`   Trung bình: ${(totalTime / 10).toFixed(2)}ms/request`);
  console.log(`   (Với cache, tất cả requests sẽ nhanh hơn)`);
}

// Test 4: Kiểm tra cache hit rate
async function testCacheHitRate() {
  console.log("\n\n📊 TEST 4: Kiểm tra Cache Hit Rate");
  console.log("=".repeat(60));

  const endpoint = `${BASE_URL}/vehicle/get`;
  const headers = { Authorization: `Bearer ${AUTH_TOKEN}` };

  // Xóa cache trước
  console.log("\n🗑️  Xóa cache (nếu có)...");
  await axios.get(endpoint, { headers }); // Request đầu sẽ cache

  const requests = [];
  const times = [];

  console.log("\n🔄 Gửi 20 requests...");
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    await axios.get(endpoint, { headers });
    const duration = Date.now() - start;
    times.push(duration);
    if (i % 5 === 0) {
      console.log(`   Request ${i + 1}: ${duration}ms`);
    }
  }

  const firstRequest = times[0]; // Cache MISS
  const avgOtherRequests =
    times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1);

  console.log(`\n📈 Kết quả:`);
  console.log(`   Request đầu (Cache MISS): ${firstRequest}ms`);
  console.log(
    `   Các request sau (Cache HIT): ${avgOtherRequests.toFixed(
      2
    )}ms (trung bình)`
  );
  console.log(
    `   Cải thiện: ${(
      ((firstRequest - avgOtherRequests) / firstRequest) *
      100
    ).toFixed(2)}%`
  );
}

// Main function
async function runTests() {
  console.log("🧪 BẮT ĐẦU TEST CACHE");
  console.log("=".repeat(60));
  console.log(`API URL: ${BASE_URL}`);
  console.log(
    `Token: ${AUTH_TOKEN ? "✅ Có" : "❌ Không có (cần set TEST_TOKEN)"}`
  );

  if (!AUTH_TOKEN) {
    console.log("\n⚠️  Cần set TEST_TOKEN trong .env để test");
    console.log("   Ví dụ: TEST_TOKEN=your_jwt_token");
    return;
  }

  try {
    await testResponseTime();
    await testCacheInvalidation();
    await testConcurrentRequests();
    await testCacheHitRate();

    console.log("\n\n✅ HOÀN THÀNH TẤT CẢ TESTS");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Lỗi khi test:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Chạy tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
