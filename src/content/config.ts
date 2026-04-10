import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'shipped', 'concept']),
    stack: z.array(z.string()),
    image: z.string().optional(),
    screenshots: z.array(z.string()).optional(),
    repo: z.string().optional(),
    demo: z.string().optional(),
    hidden_demo: z.boolean().optional(),
    order: z.number(),
  }),
});

const micro = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'shipped', 'concept']),
    stack: z.array(z.string()),
    download: z.string().optional(),
    repo: z.string().optional(),
    demo: z.string().optional(),
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
