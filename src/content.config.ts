import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		publishDate: z.coerce.date(),
		readingTime: z.string(),
		tags: z.array(z.string()),
		featured: z.boolean().default(false),
		level: z.string().optional(),
	}),
});

const games = defineCollection({
	loader: glob({ base: './src/content/games', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		year: z.string(),
		engine: z.string(),
		role: z.string(),
		status: z.string(),
		genre: z.string(),
		platforms: z.array(z.string()),
		featured: z.boolean().default(false),
	}),
});

export const collections = { blog, games };
