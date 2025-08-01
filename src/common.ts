/**
 * 通用类型定义
 */

export type Vector = number[] | Float32Array;

export interface NodeData {
  [key: string]: any;
}

export interface SearchResult {
  id: number;
  distance: number;
  data?: NodeData;
}

export interface SearchParams {
  ef?: number;
  searchListSize?: number; // Vamana uses this
}

export type VectorSimilarityFunction = 'EUCLIDEAN' | 'COSINE' | 'DOT_PRODUCT' | 'MAXIMUM_INNER_PRODUCT';

// 距离度量类型
export type DistanceMetric = 'euclidean' | 'cosine' | 'manhattan' | 'inner_product';

// 索引元数据
export interface IndexMetadata {
  nodeCount: number;
  dimension?: number;
  isTrained?: boolean;
  algorithm: string;
  parameters?: Record<string, any>;
}

// 序列化数据
export interface SerializedData {
  version: string;
  timestamp: number;
  algorithm: string;
  config: Record<string, any>;
  data: string;
}

// 邻居对象
export interface Neighbor {
  idx: number;
  distance: number;
} 