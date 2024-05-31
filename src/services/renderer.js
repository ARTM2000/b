import fs from "fs";
import ejs from "ejs";
import showdown from "showdown";

import { BlogPosts } from "./blog-posts.js";
import { Config } from "./config.js";

export class Renderer {
	#templatesFolderPath = import.meta.dirname + "/../templates/";
	#targetFolderPath = import.meta.dirname + "/../../docs/";
	#JSONDumpFilePath = import.meta.dirname + "/../../docs/data.json";
	#blogPostsDirPath = this.#targetFolderPath + "blog/";
	#blogPosts;
	#config;

	/**
	 * @param {BlogPosts} blogPosts
	 * @param {Config} config
	 */
	constructor(blogPosts, config) {
		this.#blogPosts = blogPosts;
		this.#config = config;
	}

	async renderIndexPage() {
		const templatePath = "index.ejs";
		const targetPath = "index.html";

		const content = this.#config.getContent();
		content.introduction = this.#convertMarkdownToHtml(content.introduction);

		const payload = {
			posts: (await this.#blogPosts.getMainPagePosts()).map((p) => ({
				...p,
				url: this.#getPostUrlLink(p),
			})),
			content: content,
		};
		this.#renderTemplate(templatePath, targetPath, payload);
	}

	async renderBlogPosts() {
		// first clean all blog posts
		await this.#cleanAllBlogPostFiles()
		
		const templatePath = "post.ejs";
		const allPosts = await this.#blogPosts.getAllPosts();
		const content = this.#config.getContent();

		for (let i = 0; i < allPosts.length; i++) {
			const post = allPosts[i];
			const payload = {
				post: { ...post, body: this.#convertMarkdownToHtml(post.body) },
				content: {
					...content,
					pageTitle: `${content.pageTitle} | ${post.title}`,
					metaTitle: post.title,
					metaSubTitle: post.subTitle || "",
					metaUrl: `${content.metaUrl}/${this.#getPostUrlLink(post)}`,
				},
				prevPost: null,
				nextPost: null,
			};
			if (i !== 0) {
				const nextPost = allPosts[i - 1];
				payload.nextPost = {
					title: nextPost.title,
					url: this.#getPostUrlLink(nextPost),
				};
			}

			if (i !== allPosts.length - 1) {
				const prevPost = allPosts[i + 1];
				payload.prevPost = {
					title: prevPost.title,
					url: this.#getPostUrlLink(prevPost),
				};
			}

			const targetPath = this.#getPostUrlLink(post);
			this.#renderTemplate(templatePath, targetPath, payload);
		}
	}

	async render404Page() {
		const posts = await this.#blogPosts.getMainPagePosts();
		const postsFor404 = posts.slice(0, 5);

		const templatePath = "404.ejs";
		const targetPath = "404.html";

		const content = this.#config.getContent();

		const payload = {
			posts: postsFor404.map((p) => ({
				...p,
				url: this.#getPostUrlLink(p),
			})),
			content: content,
		};
		this.#renderTemplate(templatePath, targetPath, payload);
	}

	async #cleanAllBlogPostFiles() {
		for (const file of fs.readdirSync(this.#blogPostsDirPath)) {
			if (file.match(/\.html$/)) {
				fs.unlinkSync(this.#blogPostsDirPath + file)
			}
		}
	}

	async dumpDataToJSON() {
		const d = {
			posts: [],
			categories: [],
		};

		const content = this.#config.getContent();
		const categories = {};

		const allPosts = await this.#blogPosts.getAllPosts();
		for (const p of allPosts) {
			const formattedPost = {
				id: p.id,
				title: p.title,
				subTitle: p.subTitle,
				createdAt: p.createdAt,
				publishedAt: p.publishedAt,
				categories: p.categories.map((c) => ({ id: c.id })),
				url: `${content.domain}/${this.#getPostUrlLink(p)}`,
			};
			d.posts.push(formattedPost);
			for (const cg of p.categories) {
				const postData = {
					id: p.id,
					categories: p.categories.map((c) => ({ id: c.id })),
				};

				if (categories[cg.name] === undefined) {
					categories[cg.name] = {
						...cg,
						posts: [postData],
					};
				} else {
					categories[cg.name].posts.push(postData);
				}
			}
		}
		d.categories = Object.values(categories);

		if (fs.existsSync(this.#JSONDumpFilePath)) {
			fs.unlinkSync(this.#JSONDumpFilePath);
		}
		fs.writeFileSync(this.#JSONDumpFilePath, JSON.stringify(d));
	}

	#getPostUrlLink(post) {
		return `blog/${post.id}-${this.#prettyUrl(post.title)}.html`;
	}

	#prettyUrl(value) {
		return value
			.replace(/\s{1,}/g, "-")
			.replace(/@/g, "")
			.replace(/\$/g, "")
			.replace(/!/g, "")
			.replace(/#/g, "")
			.toLowerCase();
	}

	/**
	 * @param {string} templatePath
	 * @param {string} targetPath
	 * @param {object} payload
	 */
	#renderTemplate(templatePath, targetPath, payload) {
		const fullTemplate = this.#templatesFolderPath + templatePath;
		const fullTarget = this.#targetFolderPath + targetPath;

		const templateContent = fs.readFileSync(fullTemplate, "utf8");
		const html = ejs.render(templateContent, payload, {
			includer: (originalPath) => {
				return {
					template: fs.readFileSync(
						this.#templatesFolderPath + originalPath,
						"utf8"
					),
				};
			},
		});
		fs.writeFileSync(fullTarget, html);
	}

	/**
	 * @param {string} markdown
	 * @returns {string}
	 */
	#convertMarkdownToHtml(markdown) {
		return new showdown.Converter({
			tables: true,
			emoji: true,
			noHeaderId: true,
			smoothLivePreview: true,
			tasklists: true,
		}).makeHtml(markdown);
	}
}
