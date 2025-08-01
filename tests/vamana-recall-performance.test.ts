import { describe, it, expect, beforeEach } from 'vitest'
import { createVamanaIndex, VamanaConfig, VamanaIndex } from '../src/vamana-index.js'

/**
 * 暴力搜索实现 - 用于对比召回率
 */
function bruteForceSearch(
  queryVector: Float32Array,
  vectors: Float32Array[],
  k: number,
  distanceFunction: 'euclidean' | 'cosine' | 'inner_product' = 'euclidean'
): Array<{ id: number; distance: number }> {
  const distances: Array<{ id: number; distance: number }> = []
  
  for (let i = 0; i < vectors.length; i++) {
    const distance = computeDistance(queryVector, vectors[i], distanceFunction)
    distances.push({ id: i, distance })
  }
  
  // 按距离排序
  distances.sort((a, b) => a.distance - b.distance)
  
  return distances.slice(0, k)
}

/**
 * 计算两个向量之间的距离
 */
function computeDistance(
  vecA: Float32Array,
  vecB: Float32Array,
  distanceFunction: 'euclidean' | 'cosine' | 'inner_product'
): number {
  switch (distanceFunction) {
    case 'euclidean': {
      let sum = 0
      for (let i = 0; i < vecA.length; i++) {
        const diff = vecA[i] - vecB[i]
        sum += diff * diff
      }
      return Math.sqrt(sum)
    }
    case 'cosine': {
      let dotProduct = 0
      let normA = 0
      let normB = 0
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
      }
      const normProduct = Math.sqrt(normA) * Math.sqrt(normB)
      return normProduct === 0 ? 1 : 1 - (dotProduct / normProduct)
    }
    case 'inner_product': {
      let sum = 0
      for (let i = 0; i < vecA.length; i++) {
        sum += vecA[i] * vecB[i]
      }
      return -sum
    }
    default:
      throw new Error(`不支持的距离函数: ${distanceFunction}`)
  }
}

/**
 * 计算召回率
 * @param approximateResults 近似搜索结果
 * @param exactResults 精确搜索结果
 * @returns 召回率 (0-1)
 */
function computeRecall(
  approximateResults: Array<{ id: number; distance: number }>,
  exactResults: Array<{ id: number; distance: number }>
): number {
  if (exactResults.length === 0) return 1.0
  
  const approximateIds = new Set(approximateResults.map(r => r.id))
  const exactIds = new Set(exactResults.map(r => r.id))
  
  let intersection = 0
  for (const id of exactIds) {
    if (approximateIds.has(id)) {
      intersection++
    }
  }
  
  return intersection / exactResults.length
}

describe('Vamana召回率和性能测试', () => {
  let index: VamanaIndex
  let vectors: Float32Array[]
  let testQueries: Float32Array[]

  beforeEach(() => {
    // 生成更小的测试数据集
    vectors = []
    testQueries = []
    
    // 生成200个随机向量作为数据集（减少数据量）
    for (let i = 0; i < 2000; i++) {
      const vector = new Float32Array(64) // 64维向量（减少维度）
      for (let j = 0; j < 64; j++) {
        vector[j] = Math.random() * 2 - 1 // [-1, 1]范围
      }
      vectors.push(vector)
    }
    
    // 生成20个测试查询
    for (let i = 0; i < 20; i++) {
      const query = new Float32Array(64)
      for (let j = 0; j < 64; j++) {
        query[j] = Math.random() * 2 - 1
      }
      testQueries.push(query)
    }
  })

  describe('召回率测试', () => {
    it('应该达到良好的召回率', () => {
      const config: VamanaConfig = {
        distanceFunction: 'euclidean',
        R: 16,
        L: 32,
        alpha: 1.2,
        searchListSize: 50,
        useRobustPrune: true
      }
      
      index = createVamanaIndex(config)
      vectors.forEach(vector => index.insertNode(vector))
      index.buildIndex()
      
      let totalRecall = 0
      const k = 10
      const testCount = 5 // 减少测试次数
      
      // 对每个查询进行测试
      for (let i = 0; i < testCount; i++) {
        const query = testQueries[i]
        
        // 暴力搜索得到精确结果
        const exactResults = bruteForceSearch(query, vectors, k, 'euclidean')
        
        // Vamana搜索得到近似结果
        const approximateResults = index.searchKNN(query, k)
        
        // 计算召回率
        const recall = computeRecall(approximateResults, exactResults)
        totalRecall += recall
        
        // 单个查询的召回率应该至少达到80%
        expect(recall).toBeGreaterThan(0.8)
      }
      
      const avgRecall = totalRecall / testCount
      console.log(`平均召回率: ${(avgRecall * 100).toFixed(2)}%`)
      
      // 整体召回率应该达到90%以上
      expect(avgRecall).toBeGreaterThan(0.9)
    })

    it('应该在不同k值下保持良好召回率', () => {
      const config: VamanaConfig = {
        distanceFunction: 'euclidean',
        R: 16,
        L: 32,
        alpha: 1.2,
        searchListSize: 50,
        useRobustPrune: true
      }
      
      index = createVamanaIndex(config)
      vectors.forEach(vector => index.insertNode(vector))
      index.buildIndex()
      
      const kValues = [1, 5, 10, 20]
      const query = testQueries[0]
      
      for (const k of kValues) {
        const exactResults = bruteForceSearch(query, vectors, k, 'euclidean')
        const approximateResults = index.searchKNN(query, k)
        const recall = computeRecall(approximateResults, exactResults)
        
        console.log(`k=${k}: 召回率 ${(recall * 100).toFixed(2)}%`)
        
        // 不同k值下都应该有良好的召回率
        expect(recall).toBeGreaterThan(0.8)
      }
    })

    it('应该在不同距离函数下保持良好召回率', () => {
      const distanceFunctions: Array<'euclidean' | 'cosine' | 'inner_product'> = [
        'euclidean', 'cosine', 'inner_product'
      ]
      
      for (const distanceFunction of distanceFunctions) {
        const config: VamanaConfig = {
          distanceFunction,
          R: 16,
          L: 32,
          alpha: 1.2,
          searchListSize: 50,
          useRobustPrune: true
        }
        
        index = createVamanaIndex(config)
        vectors.forEach(vector => index.insertNode(vector))
        index.buildIndex()
        
        let totalRecall = 0
        const testCount = 3 // 减少测试次数
        
        for (let i = 0; i < testCount; i++) {
          const query = testQueries[i]
          const exactResults = bruteForceSearch(query, vectors, 10, distanceFunction)
          const approximateResults = index.searchKNN(query, 10)
          const recall = computeRecall(approximateResults, exactResults)
          totalRecall += recall
        }
        
        const avgRecall = totalRecall / testCount
        console.log(`${distanceFunction}: 平均召回率 ${(avgRecall * 100).toFixed(2)}%`)
        
        expect(avgRecall).toBeGreaterThan(0.85)
      }
    })
  })

  describe('性能对比测试', () => {
    it('应该比暴力搜索快得多', () => {
      const config: VamanaConfig = {
        distanceFunction: 'euclidean',
        R: 16,
        L: 32,
        alpha: 1.2,
        searchListSize: 50,
        useRobustPrune: true
      }
      
      index = createVamanaIndex(config)
      
      // 测量构建时间
      const buildStartTime = performance.now()
      vectors.forEach(vector => index.insertNode(vector))
      index.buildIndex()
      const buildTime = performance.now() - buildStartTime
      
      console.log(`构建时间: ${buildTime.toFixed(2)}ms`)
      
      // 测量搜索性能
      const query = testQueries[0]
      const k = 10
      
      // 暴力搜索时间
      const bruteForceStartTime = performance.now()
      const bruteForceResults = bruteForceSearch(query, vectors, k, 'euclidean')
      const bruteForceTime = performance.now() - bruteForceStartTime
      
      // Vamana搜索时间
      const vamanaStartTime = performance.now()
      const vamanaResults = index.searchKNN(query, k)
      const vamanaTime = performance.now() - vamanaStartTime
      
      console.log(`暴力搜索时间: ${bruteForceTime.toFixed(2)}ms`)
      console.log(`Vamana搜索时间: ${vamanaTime.toFixed(2)}ms`)
      console.log(`加速比: ${(bruteForceTime / vamanaTime).toFixed(2)}x`)
      
      // Vamana应该比暴力搜索快至少5倍
      expect(vamanaTime).toBeLessThan(bruteForceTime / 5)
      
      // 验证召回率
      const recall = computeRecall(vamanaResults, bruteForceResults)
      expect(recall).toBeGreaterThan(0.8)
    })

    it('应该在不同数据集大小下保持性能优势', () => {
      const datasetSizes = [50, 100, 200]
      const query = testQueries[0]
      const k = 10
      
      for (const size of datasetSizes) {
        const testVectors = vectors.slice(0, size)
        
        // 暴力搜索
        const bruteForceStartTime = performance.now()
        const bruteForceResults = bruteForceSearch(query, testVectors, k, 'euclidean')
        const bruteForceTime = performance.now() - bruteForceStartTime
        
        // Vamana搜索
        const config: VamanaConfig = {
          distanceFunction: 'euclidean',
          R: 16,
          L: 32,
          alpha: 1.2,
          searchListSize: 50,
          useRobustPrune: true
        }
        
        index = createVamanaIndex(config)
        testVectors.forEach(vector => index.insertNode(vector))
        index.buildIndex()
        
        const vamanaStartTime = performance.now()
        const vamanaResults = index.searchKNN(query, k)
        const vamanaTime = performance.now() - vamanaStartTime
        
        const speedup = bruteForceTime / vamanaTime
        const recall = computeRecall(vamanaResults, bruteForceResults)
        
        console.log(`数据集大小 ${size}: 加速比 ${speedup.toFixed(2)}x, 召回率 ${(recall * 100).toFixed(2)}%`)
        
        // 随着数据集增大，加速比应该增加
        expect(speedup).toBeGreaterThan(3)
        expect(recall).toBeGreaterThan(0.8)
      }
    })

    it('应该测试批量查询的性能', () => {
      const config: VamanaConfig = {
        distanceFunction: 'euclidean',
        R: 16,
        L: 32,
        alpha: 1.2,
        searchListSize: 50,
        useRobustPrune: true
      }
      
      index = createVamanaIndex(config)
      vectors.forEach(vector => index.insertNode(vector))
      index.buildIndex()
      
      const batchSize = 10 // 减少批量大小
      const k = 10
      
      // 批量暴力搜索
      const bruteForceStartTime = performance.now()
      const bruteForceResults = []
      for (let i = 0; i < batchSize; i++) {
        const results = bruteForceSearch(testQueries[i], vectors, k, 'euclidean')
        bruteForceResults.push(results)
      }
      const bruteForceTime = performance.now() - bruteForceStartTime
      
      // 批量Vamana搜索
      const vamanaStartTime = performance.now()
      const vamanaResults = []
      for (let i = 0; i < batchSize; i++) {
        const results = index.searchKNN(testQueries[i], k)
        vamanaResults.push(results)
      }
      const vamanaTime = performance.now() - vamanaStartTime
      
      console.log(`批量暴力搜索时间: ${bruteForceTime.toFixed(2)}ms`)
      console.log(`批量Vamana搜索时间: ${vamanaTime.toFixed(2)}ms`)
      console.log(`批量加速比: ${(bruteForceTime / vamanaTime).toFixed(2)}x`)
      
      // 计算平均召回率
      let totalRecall = 0
      for (let i = 0; i < batchSize; i++) {
        const recall = computeRecall(vamanaResults[i], bruteForceResults[i])
        totalRecall += recall
      }
      const avgRecall = totalRecall / batchSize
      
      console.log(`批量平均召回率: ${(avgRecall * 100).toFixed(2)}%`)
      
      expect(vamanaTime).toBeLessThan(bruteForceTime / 5)
      expect(avgRecall).toBeGreaterThan(0.8)
    })
  })

  describe('算法稳定性测试', () => {
    it('应该在不同随机种子下保持一致的性能', () => {
      const config: VamanaConfig = {
        distanceFunction: 'euclidean',
        R: 16,
        L: 32,
        alpha: 1.2,
        searchListSize: 50,
        useRobustPrune: true
      }
      
      const query = testQueries[0]
      const k = 10
      const testVectors = vectors.slice(0, 100) // 减少测试数据
      
      const results = []
      
      // 多次运行测试
      for (let run = 0; run < 3; run++) { // 减少运行次数
        index = createVamanaIndex(config)
        testVectors.forEach(vector => index.insertNode(vector))
        index.buildIndex()
        
        const bruteForceResults = bruteForceSearch(query, testVectors, k, 'euclidean')
        const vamanaResults = index.searchKNN(query, k)
        const recall = computeRecall(vamanaResults, bruteForceResults)
        
        results.push(recall)
      }
      
      // 计算召回率的方差
      const avgRecall = results.reduce((a, b) => a + b, 0) / results.length
      const variance = results.reduce((sum, recall) => sum + Math.pow(recall - avgRecall, 2), 0) / results.length
      const stdDev = Math.sqrt(variance)
      
      console.log(`平均召回率: ${(avgRecall * 100).toFixed(2)}%`)
      console.log(`召回率标准差: ${(stdDev * 100).toFixed(2)}%`)
      
      // 召回率应该相对稳定
      expect(stdDev).toBeLessThan(0.1) // 标准差小于10%
      expect(avgRecall).toBeGreaterThan(0.8)
    })
  })

  describe('统计信息测试', () => {
    it('应该提供正确的统计信息', () => {
      const config: VamanaConfig = {
        distanceFunction: 'euclidean',
        R: 16,
        L: 32,
        alpha: 1.2,
        searchListSize: 50,
        useRobustPrune: true
      }
      
      index = createVamanaIndex(config)
      vectors.forEach(vector => index.insertNode(vector))
      index.buildIndex()
      
      const stats = index.getStats()
      
      console.log(`节点数: ${stats.nodeCount}`)
      console.log(`平均出度: ${stats.avgOutDegree.toFixed(2)}`)
      console.log(`最大出度: ${stats.maxOutDegree}`)
      console.log(`图密度: ${stats.graphDensity.toFixed(4)}`)
      
      // 验证图的基本属性
      expect(stats.nodeCount).toBe(vectors.length)
      expect(stats.avgOutDegree).toBeGreaterThan(0)
      expect(stats.maxOutDegree).toBeLessThanOrEqual(config.R!)
      expect(stats.graphDensity).toBeGreaterThan(0)
    })
  })
}) 