/**
 * RobustPrune剪枝算法模块
 * 实现Vamana图构建中的RobustPrune剪枝策略
 * 参考C++版本的occlude_list函数实现
 */

import { VamanaNode } from './graph-search.js';
import { DistanceCache, DistanceConfig, computeDistance, computeDistanceFromIds } from './distance.js';

export interface SearchCandidate {
  id: number;
  distance: number;
}
//@织:这个函数过长需要拆分
/**
 * 正确的RobustPrune算法实现
 * 参考C++版本的occlude_list函数
 * 
 * 算法流程：
 * 1. 对候选集按距离排序
 * 2. 使用递增的alpha值进行多轮剪枝
 * 3. 每轮选择最近的节点，然后剪枝被覆盖的节点
 * 
 * @param nodeId 当前节点ID
 * @param candidateIds 候选节点ID列表
 * @param alpha 剪枝参数
 * @param degree 目标度数
 * @param maxc 最大候选数量（与C++版本保持一致）
 * @param nodes 节点数组
 * @param distanceCache 距离缓存
 * @param distanceConfig 距离配置
 * @returns 剪枝后的邻居ID列表
 */
export function robustPruneStandard(
  nodeId: number,
  candidateIds: number[],
  alpha: number,
  degree: number,
  maxc: number, // 添加独立的maxc参数
  nodes: VamanaNode[],
  distanceCache: DistanceCache,
  distanceConfig: DistanceConfig
): number[] {
  if (candidateIds.length === 0) return [];


  // 步骤1: 计算所有候选节点到当前节点的距离
  const candidates: SearchCandidate[] = [];
  for (const candidateId of candidateIds) {
    if (candidateId !== nodeId && candidateId < nodes.length) {
      const distance = computeDistanceFromIds(nodeId, candidateId, nodes, distanceCache, distanceConfig);
      candidates.push({ id: candidateId, distance });
    }
  }

  // 按距离排序
  candidates.sort((a, b) => a.distance - b.distance);


  const result: number[] = [];
  const occludeFactor = new Array(candidates.length).fill(0);
  let curAlpha = 1.0;

  // 多轮剪枝，直到达到目标数量或候选集为空
  while (curAlpha <= alpha && result.length < degree) {
    let start = 0;
    const eps = curAlpha + 0.01; // 用于MIPS的epsilon值

    // 在当前alpha值下选择节点，使用maxc参数控制候选数量
    while (result.length < degree && start < candidates.length && start < maxc) {
      const candidate = candidates[start];
      
      // 检查是否被之前的alpha值剪枝
      if (occludeFactor[start] > curAlpha) {
        start++;
        continue;
      }

      // 选择这个节点
      occludeFactor[start] = Infinity;
      result.push(candidate.id);

      // 剪枝被这个节点覆盖的其他候选，使用maxc参数
      for (let t = start + 1; t < candidates.length && t < maxc; t++) {
        if (occludeFactor[t] > alpha) continue;

        const otherCandidate = candidates[t];
        const djk = computeDistanceFromIds(candidate.id, otherCandidate.id, nodes, distanceCache, distanceConfig);

        // 根据距离函数类型计算剪枝条件
        if (distanceConfig.distanceFunction === 'euclidean' || distanceConfig.distanceFunction === 'cosine') {
          // L2和Cosine距离：d(p,p') / d(p*,p') >= alpha
          if (djk === 0) {
            occludeFactor[t] = Infinity; // 避免除零
          } else {
            occludeFactor[t] = Math.max(occludeFactor[t], otherCandidate.distance / djk);
          }
        } else if (distanceConfig.distanceFunction === 'inner_product') {
          // 内积距离：需要特殊处理
          const x = -otherCandidate.distance;
          const y = -djk;
          if (y > curAlpha * x) {
            occludeFactor[t] = Math.max(occludeFactor[t], eps);
          }
        }
      }
      start++;
    }

    // 增加alpha值
    curAlpha *= 1.2;
  }

  return result;
}

/**
 * 向后兼容的RobustPrune函数，使用默认的maxc值
 * 
 * @param nodeId 当前节点ID
 * @param candidateIds 候选节点ID列表
 * @param alpha 剪枝参数
 * @param R 目标度数（保持原有参数名）
 * @param nodes 节点数组
 * @param distanceCache 距离缓存
 * @param distanceConfig 距离配置
 * @returns 剪枝后的邻居ID列表
 */
export function robustPruneStandardLegacy(
  nodeId: number,
  candidateIds: number[],
  alpha: number,
  R: number,
  nodes: VamanaNode[],
  distanceCache: DistanceCache,
  distanceConfig: DistanceConfig
): number[] {
  // 使用与C++版本一致的默认maxc值
  const maxc = Math.max(R * 2, 100);
  return robustPruneStandard(nodeId, candidateIds, alpha, R, maxc, nodes, distanceCache, distanceConfig);
}
