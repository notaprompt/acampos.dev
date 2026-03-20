import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'shipped', 'concept']),
    stack: z.array(z.string()),
    image: z.string().optional(),
    repo: z.string().optional(),
    demo: z.string().optional(),
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
    order: z.number(),
  }),
});

export const collections = { projects, micro };
