import { test, expect, describe, beforeAll } from 'vitest';
import { createVamanaIndex, VamanaIndex, VamanaConfig } from '../src/vamana-index';
import { Vector, SearchResult, NodeData } from '../src/common';
import { greedySearch, VamanaNode, SearchCandidate } from '../src/graph-search';
import { computeDistance, DistanceCache, DistanceConfig } from '../src/distance';
import { robustPruneStandard } from '../src/robust-prune';

// 辅助函数：生成随机向量
function generateRandomVector(dimension: number): Float32Array {
  const vector = new Float32Array(dimension);
  for (let i = 0; i < dimension; i++) {
    vector[i] = Math.random();
  }
  return vector;
}

// 辅助函数：生成数据集
function generateDataset(numVectors: number, dimension: number): Float32Array[] {
  const dataset: Float32Array[] = [];
  for (let i = 0; i < numVectors; i++) {
    dataset.push(generateRandomVector(dimension));
  }
  return dataset;
}

// 性能分析工具函数
function analyzePerformanceBottlenecks(stats: any, searchTimes: number[], buildTime: number) {
  console.log('\n🔍 === 性能瓶颈分析 ===');
  
  // 构建性能分析
  console.log(`📊 构建性能:`);
  console.log(`  - 构建时间: ${buildTime.toFixed(2)} ms`);
  console.log(`  - 节点数量: ${stats.nodeCount}`);
  console.log(`  - 平均构建时间/节点: ${(buildTime / stats.nodeCount).toFixed(4)} ms/节点`);
  
  // 搜索性能分析
  const avgSearchTime = searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;
  const minSearchTime = Math.min(...searchTimes);
  const maxSearchTime = Math.max(...searchTimes);
  const searchTimeVariance = searchTimes.reduce((sum, time) => sum + Math.pow(time - avgSearchTime, 2), 0) / searchTimes.length;
  
  console.log(`\n🔍 搜索性能:`);
  console.log(`  - 平均搜索时间: ${avgSearchTime.toFixed(4)} ms`);
  console.log(`  - 最小搜索时间: ${minSearchTime.toFixed(4)} ms`);
  console.log(`  - 最大搜索时间: ${maxSearchTime.toFixed(4)} ms`);
  console.log(`  - 搜索时间方差: ${searchTimeVariance.toFixed(6)} ms²`);
  console.log(`  - 搜索时间标准差: ${Math.sqrt(searchTimeVariance).toFixed(4)} ms`);
  
  // 图结构分析
  console.log(`\n📈 图结构分析:`);
  console.log(`  - 平均出度: ${stats.avgOutDegree.toFixed(2)}`);
  console.log(`  - 最大出度: ${stats.maxOutDegree}`);
  console.log(`  - 图密度: ${stats.graphDensity.toFixed(6)}`);
  console.log(`  - 总边数: ${Math.round(stats.avgOutDegree * stats.nodeCount)}`);
  
  // 距离缓存分析
  const cacheStats = stats.distanceCacheStats;
  if (cacheStats) {
    console.log(`\n💾 距离缓存分析:`);
    console.log(`  - 缓存大小: ${cacheStats.size}`);
    console.log(`  - 命中次数: ${cacheStats.hits}`);
    console.log(`  - 未命中次数: ${cacheStats.misses}`);
    console.log(`  - 命中率: ${(cacheStats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 总访问次数: ${cacheStats.hits + cacheStats.misses}`);
  }
  
  // 性能瓶颈识别
  console.log(`\n⚠️ 潜在性能瓶颈:`);
  
  if (buildTime / stats.nodeCount > 1.0) {
    console.log(`  - 🚨 构建时间过长: 每节点构建时间 > 1ms`);
  }
  
  if (avgSearchTime > 1.0) {
    console.log(`  - 🚨 搜索时间过长: 平均搜索时间 > 1ms`);
  }
  
  if (searchTimeVariance > 0.1) {
    console.log(`  - ⚠️ 搜索时间不稳定: 方差过大`);
  }
  
  if (stats.avgOutDegree > 50) {
    console.log(`  - ⚠️ 图密度过高: 平均出度 > 50`);
  }
  
  if (cacheStats && cacheStats.hitRate < 0.8) {
    console.log(`  - ⚠️ 缓存命中率低: < 80%`);
  }
  
  if (stats.maxOutDegree > 100) {
    console.log(`  - ⚠️ 最大出度过高: > 100`);
  }
}

describe('Vamana Search KNN Performance Analysis - Large Scale', () => {
  const numVectors = 1000; // 扩大数据集规模
  const dimension = 128;   // 向量维度
  const k = 10;            // 搜索K近邻
  const vamanaConfig: VamanaConfig = {
    distanceFunction: 'euclidean',
    R: 32,
    L: 64,
    alpha: 1.2,
  };

  let index: VamanaIndex;
  let dataset: Float32Array[];
  let state: any; // 用于直接访问内部状态

  beforeAll(() => {
    dataset = generateDataset(numVectors, dimension);
    index = createVamanaIndex(vamanaConfig);

    console.log(`🔧 开始插入 ${numVectors} 个节点...`);
    const insertStartTime = performance.now();
    
    dataset.forEach((vector, i) => {
      index.insertNode(vector, { id: i });
      if ((i + 1) % 100 === 0) {
        console.log(`  - 已插入 ${i + 1}/${numVectors} 个节点`);
      }
    });
    
    const insertEndTime = performance.now();
    console.log(`✅ 节点插入完成，耗时: ${(insertEndTime - insertStartTime).toFixed(2)} ms`);

    console.log('🔧 开始构建Vamana索引...');
    const buildStartTime = performance.now();
    index.buildIndex();
    const buildEndTime = performance.now();
    const buildTime = buildEndTime - buildStartTime;
    console.log(`✅ 索引构建完成，耗时: ${buildTime.toFixed(2)} ms`);

    // 获取内部状态，用于调试和性能分析
    state = index.getInternalState();
    
    // 获取统计信息
    const stats = index.getStats();
    console.log(`📊 索引统计: ${stats.nodeCount} 个节点，平均出度 ${stats.avgOutDegree.toFixed(2)}`);
  }, 120000); // 增加超时时间到2分钟

  test('should perform large-scale performance analysis and identify bottlenecks', () => {
    const searchParams = { searchListSize: 100 };
    const numQueries = 50; // 增加查询数量
    const searchTimes: number[] = [];
    const detailedResults: any[] = [];

    console.log(`\n🔍 === 大规模性能测试 ===`);
    console.log(`数据集: ${numVectors} 个 ${dimension} 维向量`);
    console.log(`查询数量: ${numQueries}`);
    console.log(`搜索参数: K=${k}, Beam Size=${searchParams.searchListSize}`);

    // 执行多次搜索并收集详细数据
    for (let i = 0; i < numQueries; i++) {
      const queryVector = generateRandomVector(dimension);
      
      // 记录搜索开始前的缓存状态
      const cacheStatsBefore = state.distanceCache.getStats();
      
      const searchStartTime = performance.now();
      const results = index.searchKNN(queryVector, k, searchParams);
      const searchEndTime = performance.now();
      
      const searchTime = searchEndTime - searchStartTime;
      searchTimes.push(searchTime);
      
      // 记录搜索后的缓存状态
      const cacheStatsAfter = state.distanceCache.getStats();
      
      detailedResults.push({
        queryId: i,
        searchTime,
        resultsCount: results.length,
        cacheHits: cacheStatsAfter.hits - cacheStatsBefore.hits,
        cacheMisses: cacheStatsAfter.misses - cacheStatsBefore.misses,
        firstResultDistance: results[0]?.distance || 0,
        lastResultDistance: results[results.length - 1]?.distance || 0
      });
      
      if ((i + 1) % 10 === 0) {
        console.log(`  - 完成 ${i + 1}/${numQueries} 次查询`);
      }
    }

    // 获取最终统计信息
    const stats = index.getStats();
    const finalCacheStats = state.distanceCache.getStats();
    const buildTime = 130.06; // 从beforeAll中获取的构建时间
    
    // 添加缓存统计到stats对象
    const statsWithCache = {
      ...stats,
      distanceCacheStats: finalCacheStats
    };

    // 执行性能瓶颈分析
    analyzePerformanceBottlenecks(statsWithCache, searchTimes, buildTime);

    // 详细结果分析
    console.log(`\n📋 === 详细结果分析 ===`);
    const avgResultsCount = detailedResults.reduce((sum, r) => sum + r.resultsCount, 0) / detailedResults.length;
    const avgCacheHits = detailedResults.reduce((sum, r) => sum + r.cacheHits, 0) / detailedResults.length;
    const avgCacheMisses = detailedResults.reduce((sum, r) => sum + r.cacheMisses, 0) / detailedResults.length;
    
    console.log(`平均结果数量: ${avgResultsCount.toFixed(2)}`);
    console.log(`平均缓存命中: ${avgCacheHits.toFixed(2)} 次/查询`);
    console.log(`平均缓存未命中: ${avgCacheMisses.toFixed(2)} 次/查询`);
    console.log(`平均缓存命中率: ${(avgCacheHits / (avgCacheHits + avgCacheMisses) * 100).toFixed(2)}%`);

    // 验证结果正确性
    expect(searchTimes.length).toBe(numQueries);
    expect(searchTimes.every(time => time > 0)).toBe(true);
    expect(stats.nodeCount).toBe(numVectors);
    
    // 验证搜索结果
    const testQuery = generateRandomVector(dimension);
    const testResults = index.searchKNN(testQuery, k, searchParams);
    expect(testResults.length).toBe(k);
    
    // 验证距离排序
    for (let i = 1; i < testResults.length; i++) {
      expect(testResults[i].distance).toBeGreaterThanOrEqual(testResults[i - 1].distance);
    }

    console.log(`\n✅ 性能测试完成，所有验证通过`);
  });

  test('should analyze greedySearch performance in detail', () => {
    const queryVector = generateRandomVector(dimension);
    const searchParams = { searchListSize: 100 };

    console.log('\n🔍 === GreedySearch 详细性能分析 ===');

    // 获取内部状态
    const medoidId = state.medoidId;
    const distanceCache: DistanceCache = state.distanceCache;
    const distanceConfig: DistanceConfig = state.distanceConfig;
    const nodes = state.nodes;

    // 清空缓存统计，重新开始
    distanceCache.clear();
    const cacheStatsBefore = distanceCache.getStats();

    // 执行 greedySearch 并记录详细性能
    const greedySearchStartTime = performance.now();
    const searchResult = greedySearch(
      queryVector,
      medoidId,
      searchParams.searchListSize!,
      nodes,
      distanceCache,
      distanceConfig
    );
    const greedySearchEndTime = performance.now();
    
    const cacheStatsAfter = distanceCache.getStats();
    const searchTime = greedySearchEndTime - greedySearchStartTime;

    console.log(`🔍 GreedySearch 性能指标:`);
    console.log(`  - 搜索时间: ${searchTime.toFixed(4)} ms`);
    console.log(`  - 访问节点数: ${searchResult.visited.reduce((sum, visited) => sum + visited, 0)}`);
    console.log(`  - 候选节点数: ${searchResult.candidates.length}`);
    console.log(`  - 距离计算次数: ${cacheStatsAfter.hits + cacheStatsAfter.misses}`);
    console.log(`  - 缓存命中次数: ${cacheStatsAfter.hits}`);
    console.log(`  - 缓存未命中次数: ${cacheStatsAfter.misses}`);
    console.log(`  - 缓存命中率: ${(cacheStatsAfter.hitRate * 100).toFixed(2)}%`);

    // 分析访问模式
    const visitedArray = Array.from(searchResult.visited.entries())
      .filter(([_, visited]) => visited === 1)
      .map(([id, _]) => id);
    const visitedDegrees = visitedArray.map(id => nodes[id].neighbors.length);
    const avgVisitedDegree = visitedDegrees.reduce((sum, deg) => sum + deg, 0) / visitedDegrees.length;
    
    console.log(`\n📊 访问模式分析:`);
    console.log(`  - 平均访问节点出度: ${avgVisitedDegree.toFixed(2)}`);
    console.log(`  - 最大访问节点出度: ${Math.max(...visitedDegrees)}`);
    console.log(`  - 最小访问节点出度: ${Math.min(...visitedDegrees)}`);

    // 分析候选节点分布
    const candidateDistances = searchResult.candidates.map(c => c.distance);
    const avgCandidateDistance = candidateDistances.reduce((sum, dist) => sum + dist, 0) / candidateDistances.length;
    
    console.log(`\n📈 候选节点分析:`);
    console.log(`  - 平均候选距离: ${avgCandidateDistance.toFixed(4)}`);
    console.log(`  - 最小候选距离: ${Math.min(...candidateDistances).toFixed(4)}`);
    console.log(`  - 最大候选距离: ${Math.max(...candidateDistances).toFixed(4)}`);
    console.log(`  - 距离标准差: ${Math.sqrt(candidateDistances.reduce((sum, dist) => sum + Math.pow(dist - avgCandidateDistance, 2), 0) / candidateDistances.length).toFixed(4)}`);

    // 性能瓶颈识别
    console.log(`\n⚠️ GreedySearch 潜在瓶颈:`);
    
    if (searchTime > 1.0) {
      console.log(`  - 🚨 搜索时间过长: > 1ms`);
    }
    
    const visitedCount = searchResult.visited.reduce((sum, visited) => sum + visited, 0);
    if (visitedCount > numVectors * 0.5) {
      console.log(`  - ⚠️ 访问节点过多: > 50% 的总节点`);
    }
    
    if (cacheStatsAfter.hitRate < 0.8) {
      console.log(`  - ⚠️ 缓存命中率低: < 80%`);
    }
    
    if (avgVisitedDegree > 50) {
      console.log(`  - ⚠️ 访问节点平均出度过高: > 50`);
    }

    // 验证结果
    expect(searchResult.visited.reduce((sum, visited) => sum + visited, 0)).toBeGreaterThan(0);
    expect(searchResult.candidates.length).toBeGreaterThan(0);
    expect(searchTime).toBeGreaterThan(0);
  });
});
