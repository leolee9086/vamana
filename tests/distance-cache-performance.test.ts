import { test, expect, describe } from 'vitest';
import { DistanceCache } from '../src/distance';

describe('DistanceCache Performance Tests', () => {
  
  // 模拟距离计算函数
  function mockDistanceFunction(id1: number, id2: number): number {
    // 模拟一个简单的距离计算，返回两个ID的差的绝对值
    return Math.abs(id1 - id2);
  }

  test('should perform LRU cache optimization with numeric keys', () => {
    const cache = new DistanceCache(100);
    const testCount = 1000;
    
    // 预热缓存
    for (let i = 0; i < 50; i++) {
      cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'euclidean');
    }
    
    // 性能测试 - 缓存命中
    const startTime = performance.now();
    for (let i = 0; i < testCount; i++) {
      cache.getCachedDistance(i % 50, (i % 50) + 1, mockDistanceFunction, 'euclidean');
    }
    const endTime = performance.now();
    
    const avgTime = (endTime - startTime) / testCount;
    console.log(`LRU cache hit performance: ${avgTime.toFixed(6)}ms per call`);
    
    // 验证缓存统计
    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(0.8); // 应该有高命中率
    expect(stats.evictions).toBe(0); // 不应该有淘汰
  });

  test('should handle cache eviction correctly', () => {
    const cache = new DistanceCache(5); // 小缓存大小，容易触发淘汰
    
    // 填充缓存
    for (let i = 0; i < 10; i++) {
      cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'cosine');
    }
    
    const stats = cache.getStats();
    expect(stats.size).toBe(5); // 缓存大小应该被限制
    expect(stats.evictions).toBeGreaterThan(0); // 应该有淘汰发生
    
    console.log(`Cache eviction test - Size: ${stats.size}, Evictions: ${stats.evictions}`);
  });

  test('should provide detailed statistics by distance function', () => {
    const cache = new DistanceCache(100);
    
    // 测试不同距离函数的缓存
    for (let i = 0; i < 50; i++) {
      cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'euclidean');
      cache.getCachedDistance(i, i + 2, mockDistanceFunction, 'cosine');
      cache.getCachedDistance(i, i + 3, mockDistanceFunction, 'inner_product');
    }
    
    // 重复访问，测试命中率
    for (let i = 0; i < 20; i++) {
      cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'euclidean');
      cache.getCachedDistance(i, i + 2, mockDistanceFunction, 'cosine');
    }
    
    const stats = cache.getStats();
    console.log('Distance function statistics:', stats.distanceFunctionHitRates);
    
    expect(stats.distanceFunctionHitRates).toHaveProperty('euclidean');
    expect(stats.distanceFunctionHitRates).toHaveProperty('cosine');
    expect(stats.distanceFunctionHitRates).toHaveProperty('inner_product');
  });

  test('should handle large cache sizes efficiently', () => {
    const cacheSizes = [100, 1000, 10000];
    
    for (const maxSize of cacheSizes) {
      const cache = new DistanceCache(maxSize);
      const testCount = maxSize * 2; // 测试超出缓存大小的访问
      
      const startTime = performance.now();
      for (let i = 0; i < testCount; i++) {
        cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'euclidean');
      }
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / testCount;
      
      console.log(`Cache size ${maxSize}: ${avgTime.toFixed(6)}ms per call, Total: ${totalTime.toFixed(2)}ms`);
      
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(maxSize);
      expect(stats.maxSize).toBe(maxSize);
    }
  });

  test('should maintain cache consistency with symmetric keys', () => {
    const cache = new DistanceCache(100);
    
    // 测试对称键的一致性
    cache.getCachedDistance(1, 2, mockDistanceFunction, 'euclidean');
    expect(cache.has(2, 1)).toBe(true); // 应该能找到反向键
    
    const value1 = cache.getCachedDistance(1, 2, mockDistanceFunction, 'euclidean');
    const value2 = cache.getCachedDistance(2, 1, mockDistanceFunction, 'euclidean');
    expect(value1).toBe(value2); // 对称键应该返回相同值
    
    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThan(0); // 应该有缓存命中
  });

  test('should handle cache size changes correctly', () => {
    const cache = new DistanceCache(100);
    
    // 填充缓存
    for (let i = 0; i < 80; i++) {
      cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'euclidean');
    }
    
    expect(cache.getSize()).toBe(80);
    
    // 减小缓存大小
    cache.setMaxSize(50);
    expect(cache.getSize()).toBe(50); // 应该自动淘汰多余的项
    
    // 增大缓存大小
    cache.setMaxSize(200);
    expect(cache.getSize()).toBe(50); // 大小不应该改变，因为没有新项
    
    console.log(`Cache size change test - Final size: ${cache.getSize()}`);
  });

  test('should provide memory usage estimation', () => {
    const cache = new DistanceCache(100);
    
    // 添加一些数据
    for (let i = 0; i < 50; i++) {
      cache.getCachedDistance(i, i + 1, mockDistanceFunction, 'euclidean');
    }
    
    const stats = cache.getStats();
    expect(stats.memoryUsage).toBeGreaterThan(0);
    expect(stats.memoryUsage).toBe(stats.size * 8); // 每个条目8字节的估算
    
    console.log(`Memory usage estimation: ${stats.memoryUsage} bytes for ${stats.size} entries`);
  });

  test('should handle manual cache operations', () => {
    const cache = new DistanceCache(100);
    
    // 手动设置缓存项
    cache.set(1, 2, 1.5);
    expect(cache.has(1, 2)).toBe(true);
    expect(cache.has(2, 1)).toBe(true); // 对称键
    
    // 通过getCachedDistance获取应该命中缓存
    const value = cache.getCachedDistance(1, 2, mockDistanceFunction, 'euclidean');
    expect(value).toBe(1.5);
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(1); // 应该有一次命中
  });

  test('should perform concurrent access simulation', () => {
    const cache = new DistanceCache(1000);
    const testCount = 10000;
    
    // 模拟并发访问模式
    const startTime = performance.now();
    for (let i = 0; i < testCount; i++) {
      const id1 = Math.floor(Math.random() * 100);
      const id2 = Math.floor(Math.random() * 100);
      if (id1 !== id2) {
        cache.getCachedDistance(id1, id2, mockDistanceFunction, 'euclidean');
      }
    }
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    const avgTime = totalTime / testCount;
    
    console.log(`Concurrent access simulation: ${avgTime.toFixed(6)}ms per call, Total: ${totalTime.toFixed(2)}ms`);
    
    const stats = cache.getStats();
    console.log(`Final stats - Hit rate: ${(stats.hitRate * 100).toFixed(2)}%, Evictions: ${stats.evictions}`);
    
    expect(stats.hitRate).toBeGreaterThan(0); // 应该有缓存命中
  });
}); 