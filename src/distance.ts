/**
 * 距离计算模块
 * 提供高性能的距离计算和缓存功能
 */

import { Vector } from './common.js';

// ================ 类型定义 ================

export type DistanceFunction = 'euclidean' | 'cosine' | 'inner_product' | 'custom';

export interface DistanceConfig {
  distanceFunction: DistanceFunction;
  customDistanceFunction?: (a: any, b: any) => number;
}

// ================ 距离计算函数 ================

/**
 * 计算欧几里得距离
 */
export function computeEuclideanDistance(vecA: Float32Array, vecB: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * 计算余弦距离
 */
export function computeCosineDistance(vecA: Float32Array, vecB: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const normProduct = Math.sqrt(normA) * Math.sqrt(normB);
  return normProduct === 0 ? 1 : 1 - (dotProduct / normProduct);
}

/**
 * 计算内积距离（返回负值，因为我们要找最小距离）
 */
export function computeInnerProductDistance(vecA: Float32Array, vecB: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return -sum;
}

/**
 * 根据配置计算距离
 */
export function computeDistance(
  vecA: Float32Array, 
  vecB: Float32Array, 
  config: DistanceConfig
): number {
  if (config.distanceFunction === 'custom' && config.customDistanceFunction) {
    return config.customDistanceFunction(
      { vector: vecA }, 
      { vector: vecB }
    );
  }

  switch (config.distanceFunction) {
    case 'euclidean':
      return computeEuclideanDistance(vecA, vecB);
    case 'cosine':
      return computeCosineDistance(vecA, vecB);
    case 'inner_product':
      return computeInnerProductDistance(vecA, vecB);
    default:
      throw new Error(`不支持的距离函数: ${config.distanceFunction}`);
  }
}

/**
 * 基于节点ID计算距离的工具函数
 */
export function computeDistanceFromIds(
  id1: number, 
  id2: number, 
  nodes: any[], 
  distanceCache: DistanceCache, 
  distanceConfig: DistanceConfig
): number {
  if (id1 === id2) return 0;
  return distanceCache.getCachedDistance(id1, id2, (a, b) => {
    return computeDistance(nodes[a].vector, nodes[b].vector, distanceConfig);
  });
}

// ================ 距离缓存 ================

/**
 * 高性能距离缓存 - 使用Map缓存距离计算结果
 */
export class DistanceCache {
  private cache = new Map<string, number>();
  private hits = 0;
  private misses = 0;

  /**
   * 获取缓存的距离，如果不存在则计算并缓存
   */
  getCachedDistance(
    id1: number, 
    id2: number, 
    computeFn: (id1: number, id2: number) => number
  ): number {
    // 确保一致的键顺序
    const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    
    if (this.cache.has(key)) {
      this.hits++;
      return this.cache.get(key)!;
    }
    
    const distance = computeFn(id1, id2);
    this.cache.set(key, distance);
    this.misses++;
    return distance;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }
} 