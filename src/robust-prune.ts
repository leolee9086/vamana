/**
 * RobustPrune剪枝算法模块
 * 实现Vamana图构建中的RobustPrune剪枝策略
 */

import { VamanaNode } from './graph-search.js';
import { DistanceCache, DistanceConfig, computeDistance, computeDistanceFromIds } from './distance.js';

/**
 * 标准RobustPrune算法实现
 * 严格按照论文中的算法流程：
 * 1. 初始化候选集R = candidateIds ∪ sourceNode.neighbors \ {nodeId}
 * 2. 重置：清空sourceNode的出边(在调用处处理)
 * 3. 贪心选择：重复选择R中与p最近的点p*
 * 4. 剪枝：移除满足α*dist(p*,p') ≤ d(p,p')的点p'
 * 5. 直到出邻居数≥R或候选集为空
 */
export function robustPruneStandard(
  nodeId: number,
  candidateIds: number[],
  alpha: number,
  R: number,
  nodes: VamanaNode[],
  distanceCache: DistanceCache,
  distanceConfig: DistanceConfig
): number[] {
  const sourceNode = nodes[nodeId];
  if (!sourceNode) return [];



  // 步骤1: 初始化候选集R = candidateIds ∪ sourceNode.neighbors \ {nodeId}
  const candidateSet = new Set<number>(candidateIds);
  for (const neighborId of sourceNode.neighbors) {
    if (neighborId < nodes.length) {
      candidateSet.add(neighborId);
    }
  }
  candidateSet.delete(nodeId); // 移除自身

  if (candidateSet.size === 0) return [];

  const newNeighbors: number[] = [];
  
  // 步骤2: 重置 - sourceNode的出边将在返回后被重置
  
  // 步骤3-5: 贪心选择 + 剪枝循环
  while (newNeighbors.length < R && candidateSet.size > 0) {
    // 步骤3.1: 找到候选集中与p最近的点p*
    let closestCandidate: number | null = null;
    let closestDistance = Infinity;
    
    for (const candidateId of candidateSet) {
      const distance = computeDistanceFromIds(nodeId, candidateId, nodes, distanceCache, distanceConfig);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCandidate = candidateId;
      }
    }
    
    if (closestCandidate === null) break;
    
    // 步骤3.2: 构建有向边p→p*
    newNeighbors.push(closestCandidate);
    candidateSet.delete(closestCandidate);
    
    // 步骤4: 剪枝 - 对于候选集中的每个点p'，检查α*dist(p*,p') ≤ d(p,p')
    const candidatesToRemove: number[] = [];
    
    for (const otherCandidateId of candidateSet) {
      const distPToOther = computeDistanceFromIds(nodeId, otherCandidateId, nodes, distanceCache, distanceConfig); // d(p,p')
      const distClosestToOther = computeDistanceFromIds(closestCandidate, otherCandidateId, nodes, distanceCache, distanceConfig); // dist(p*,p')
      
      // RobustPrune条件：α*dist(p*,p') ≤ d(p,p')
      if (alpha * distClosestToOther <= distPToOther) {
        candidatesToRemove.push(otherCandidateId);
      }
    }
    
    // 移除满足剪枝条件的候选点
    for (const candidateToRemove of candidatesToRemove) {
      candidateSet.delete(candidateToRemove);
    }
  }

  return newNeighbors;
} 