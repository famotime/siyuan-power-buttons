# Click Sequence Value Half-Width Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the click-sequence `value` field use half-width so it pairs with `valueMode` on the same row.

**Architecture:** Keep the existing click-sequence editor DOM structure and only narrow the `value` row by changing the scoped SCSS rule that controls full-width fields. Extend the focused layout test so it asserts only `selector` remains full-width.

**Tech Stack:** Vue 3, TypeScript, SCSS, Vitest, Vite

---
