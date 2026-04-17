# Click Sequence Step Cards And Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give click-sequence steps a clearer card treatment and allow drag-and-drop reordering from a left-side handle.

**Architecture:** Keep drag state local to `src/App.vue`, reuse `moveItem()` for array reordering, and persist through the existing click-sequence sync path. Extend the focused settings tests to verify the card styling hook, drag handle presence, and reordered steps.

**Tech Stack:** Vue 3, TypeScript, SCSS, Vitest, Vite

---
