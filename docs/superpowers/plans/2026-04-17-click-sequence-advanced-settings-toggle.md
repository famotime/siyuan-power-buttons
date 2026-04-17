# Click Sequence Advanced Settings Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-step advanced-settings toggle so click-sequence steps show only the selector row by default and expand the rest of the fields on demand.

**Architecture:** Keep the toggle state local to `src/App.vue` and do not write it into persisted config. Update the focused settings layout test to verify the collapsed/expanded behavior, then add a small scoped layout wrapper plus a toggle button in the click-sequence step template.

**Tech Stack:** Vue 3, TypeScript, SCSS, Vitest, Vite

---
