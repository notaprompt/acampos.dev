import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'shipped', 'concept']),
    stack: z.array(z.string()),
    repo: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { projects };
