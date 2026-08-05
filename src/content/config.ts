import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'shipped', 'concept', 'absorbed']),
    stack: z.array(z.string()),
    image: z.string().optional(),
    // A shot may carry a caption ("fixture data", "production"). Plain strings
    // stay valid so existing entries don't churn.
    screenshots: z
      .array(z.union([z.string(), z.object({ src: z.string(), caption: z.string().optional() })]))
      .optional(),
    repo: z.string().optional(),
    demo: z.string().optional(),
    // Proof, not prose: every number dated, sourced where it helps.
    metrics: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          asof: z.string(),
          source: z.string().optional(),
        }),
      )
      .optional(),
    order: z.number(),
  }),
});

const micro = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'shipped', 'concept', 'absorbed']),
    stack: z.array(z.string()),
    download: z.string().optional(),
    repo: z.string().optional(),
    demo: z.string().optional(),
    image: z.string().optional(),
    screenshots: z
      .array(z.union([z.string(), z.object({ src: z.string(), caption: z.string().optional() })]))
      .optional(),
    // hidden = unlisted, not unbuilt: the page exists for deep links
    // (hall-of-shame writeups), the index doesn't advertise it.
    hidden: z.boolean().optional(),
    order: z.number(),
  }),
});

const essays = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    status: z.enum(['draft', 'published']),
    date: z.string(),
    series: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const collections = { projects, micro, essays };
