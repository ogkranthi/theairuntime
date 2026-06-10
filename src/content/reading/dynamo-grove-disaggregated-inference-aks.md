---
title: Scaling Multi-Node LLM Inference with NVIDIA Dynamo-Grove on AKS (Part 4)
url: https://blog.aks.azure.com/2026/06/02/dynamo-on-aks-part-4
source: Microsoft AKS Engineering / NVIDIA
author: Microsoft AKS Engineering Team
pillar: inference
tags: [inference, serving, kubernetes, disaggregated]
summary: |
  Disaggregated LLM inference splits the router, prefill workers, and decode
  workers into independently scaling pools, but standard Kubernetes lacks a
  primitive to describe these tightly coupled startup and scaling dependencies
  as a single unit. This post introduces NVIDIA Grove, a Kubernetes-native API
  that lets operators declare the full serving pipeline as a single spec rather
  than stitching together separate deployments. The demo runs Llama-3.1-70B-FP8
  across two ND96isr H100 nodes with tensor parallelism across all 16 GPUs.
  The series builds toward fully automated SLO-driven autoscaling where the
  Dynamo Planner monitors token queue depth and adjusts pool sizes independently.
publishedAt: 2026-06-02
addedAt: 2026-06-10
relatedEvents: []
relatedSpeakers: []
highlight: false
---
