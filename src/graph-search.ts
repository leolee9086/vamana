/**
 * 图搜索模块
 * 提供高性能的图搜索算法
 */

import { Vector } from './common.js';
import { DistanceConfig, DistanceCache, computeDistance, computeDistanceFromIds } from './distance.js';

// ================ 类型定义 ================

export interface VamanaNode {
  vector: Float32Array;
  id: number;
  data: any;
  neighbors: number[]; // 出边邻居列表
}

export interface SearchCandidate {
  id: number;
  distance: number;
}

export interface SearchResult {
  candidates: SearchCandidate[];
  visited: Set<number>;
}

// ================ 图搜索算法 ================

/**
 * 贪婪图搜索算法
 * 从起始节点开始，逐步探索最近的邻居节点
 */
export function greedySearch(
  queryVector: Float32Array,
  startNodeId: number,
  beamSize: number,
  nodes: VamanaNode[],
  distanceCache: DistanceCache,
  distanceConfig: DistanceConfig
): SearchResult {
  const candidates: SearchCandidate[] = [];
  const visited = new Set<number>();
  const candidateSet = new Set<number>();

  if (nodes.length === 0) {
    return { candidates: [], visited };
  }



  // 初始化候选集
  candidates.push({
    id: startNodeId,
    distance: computeDistance(queryVector, nodes[startNodeId].vector, distanceConfig)
  });
  candidateSet.add(startNodeId);

  let loopCount = 0;
  const maxLoops = nodes.length * 2;

  while (true) {
    loopCount++;
    if (loopCount > maxLoops) {
      console.error('greedySearch死循环风险!', {
        startNodeId,
        beamSize,
        visitedSize: visited.size,
        candidates: candidates.map(c => c.id)
      });
      throw new Error(`greedySearch loop limit exceeded: ${maxLoops}`);
    }

    // 找到候选集中未访问的最近节点
    let bestCandidate: SearchCandidate | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!visited.has(candidate.id)) {
        if (!bestCandidate || candidate.distance < bestCandidate.distance) {
          bestCandidate = candidate;
        }
      }
    }

    if (!bestCandidate) break;

    visited.add(bestCandidate.id);
    const currentNode = nodes[bestCandidate.id];

    // 探索当前节点的邻居
    for (const neighborId of currentNode.neighbors) {
      if (neighborId < nodes.length && !candidateSet.has(neighborId)) {
        const distance = computeDistance(queryVector, nodes[neighborId].vector, distanceConfig);
        candidates.push({ id: neighborId, distance });
        candidateSet.add(neighborId);
      }
    }

    // 保持候选集大小限制
    if (candidates.length > beamSize) {
      candidates.sort((a, b) => a.distance - b.distance);
      candidates.splice(beamSize);
      
      // 更新candidateSet
      candidateSet.clear();
      for (const candidate of candidates) {
        candidateSet.add(candidate.id);
      }
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return { candidates, visited };
}

/**
 * 找到数据集的中位点（medoid）
 */
export function findMedoid(
  nodes: VamanaNode[],
  distanceCache: DistanceCache,
  distanceConfig: DistanceConfig
): number {
  if (nodes.length === 0) return 0;
  if (nodes.length === 1) return 0;



  let bestMedoid = 0;
  let minTotalDistance = Infinity;

  for (let i = 0; i < nodes.length; i++) {
    let totalDistance = 0;
    for (let j = 0; j < nodes.length; j++) {
      if (i !== j) {
        totalDistance += computeDistanceFromIds(i, j, nodes, distanceCache, distanceConfig);
      }
    }
    
    if (totalDistance < minTotalDistance) {
      minTotalDistance = totalDistance;
      bestMedoid = i;
    }
  }

  return bestMedoid;
} 