---
title: "CAP Theorem"
date: "2026-03-22"
tags: [system-design, distributed-systems, cap-theorem]
---

# CAP Theorem

C - Consistency

A - Availability

P - Partition Tolerance

According to CAP Theorem, a distributed system can only guaratnee 2 of these.

---

## CP - Consistency and Partition Tolerance

Used when atomic read writes are needed. It might not be available to all users and it ensures consistency, leading to waiting times to other users when a operation on the same reqeusted resource is happening. Ensures all operations are atomic and same data is shown to the all the users.

---

## AP - Availability And Partition Tolerance

Used when system needs to respond to the user no matter what. Responses will be given with whatever data is avaialbe to the node at the moment. Write propagation from other nodes will take time to be reflected.
