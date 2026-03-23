---
title: "System Design Basics"
date: "2026-03-22"
tags: [system-design, basics, architecture, metrics]
---

# System Design

Process for understanding requiements, defining architecure, desgining components, and their interactions 

Performance, Scalability, Latency, Throughput, Consistency, Availablity

---

# Metrics and Trade-offs

## Performance Vs Scalablity

If a system is slow to single user then it has a performance issue.

If a system is fast to a single user but is slow under load then it has a scale issue.

Ideally, a system is scalable if the perforance is directly proportional to the number of resources added.

---

## Latency Vs Throughput

Latency is the time taken by the system to respond to the user's request.

Throughput is the number of user requests the system can handle at the same time.

Ideally, aim for maximal throughput with acceptable latency.

---

## Consistency Vs Availablity

Consistency is if the same data can be shown to all users at the same time.

Availablity is if the system can service users even in case of failures, basically the uptime of the system. The percentage of time the system is up and running.

In distributed systems, there is always a tradeoff between avaialbity and consistency.
