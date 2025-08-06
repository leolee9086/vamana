import type { VamanaNode } from "../types";

/**
 * 计算给定节点集合的质心向量
 * 
 * 性能优化说明：
 * 1. 使用for循环替代for...of循环，减少迭代器开销
 * 2. 预分配Float32Array避免动态内存分配
 * 3. 连续内存访问模式，提高缓存命中率
 * 4. 单次遍历完成累加，避免重复计算
 * 
 * @param nodes - 要计算质心的节点数组
 * @param dim - 向量维度
 * @param nodeCount - 节点数量（用于除法优化）
 * @returns 质心向量，类型为Float32Array
 */
export const findCentroid = (nodes: VamanaNode[], dim: number, nodeCount: number): Float32Array => {
    // 预分配质心向量，初始化为0
    const centroid = new Float32Array(dim);
    // 使用for循环遍历节点，性能优于for...of
    for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
        const node = nodes[nodeIndex];
        const vector = node.vector;
        // 连续访问向量元素，提高缓存效率
        for (let i = 0; i < dim; i++) {
            centroid[i] += vector[i];
        }
    }
    // 计算平均值，使用预计算的nodeCount避免重复计算
    const invNodeCount = 1 / nodeCount;
    for (let i = 0; i < dim; i++) {
        centroid[i] *= invNodeCount;
    }

    return centroid;
};