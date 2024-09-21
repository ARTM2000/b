import https from 'https'
import { Config } from './config.js';

export class BlogPosts {
    #githubRepositoryAddress
    #posts
    #authorUsernames
    #repoPAT

    /**
     * @param {Config} config 
     */
    constructor(config) {
        this.#posts = [];
        this.#githubRepositoryAddress = config.getFullRepoName()
        this.#authorUsernames = config.getAuthorUsernames()
        this.#repoPAT = config.getRepoPAT();
    }

    /**
     * @returns {Promise<array>}
     */
    async getMainPagePosts() {
        if (this.#posts.length === 0) {
            await this.#fetchAllPosts()
        }

        return this.#posts;
    }

    /**
     * @returns {Promise<array>}
     */
    async getAllPosts() {
        if (this.#posts.length === 0) {
            await this.#fetchAllPosts()
        }

        return this.#posts;
    }

    async #fetchAllPosts() {
        let page = 1, perPage = 30;
        while (true) {
            console.log(`request for page ${page} with count of ${perPage}`);
            const posts = (await this.#fetchPostsByPage(page, perPage))
                .filter((p) => this.#filterPost(p))
                .map((p) => this.#formatPost(p))
            this.#posts.push(...posts)
            if (posts.length === 0 || posts.length < perPage) {
                break;
            }
            page++;
        }

        this.#posts.sort((a, b) => new Date(a.createdAt).valueOf() < new Date(b.createdAt).valueOf())
    }

    /**
     * @param {object} post
     * @returns {boolean}
     */
    #filterPost(post) {
        if (post.author_association != "OWNER" || Object.keys(this.#authorUsernames).indexOf(post.user.login) < 0) {
            return false
        }
        if (post.title.match(/^\[Archived\]/)) {
            return false
        }

        return true
    }

    /**
     * @param {object} post
     * @returns {object}
     */
    #formatPost(post) {
        const p = {}
        p.id = post.id;
        p.subTitle = '';
        const subTitleRegexp = new RegExp(/\[.+\]/)
        if (subTitleRegexp.test(post.title)) {
            p.subTitle = 
            post.title.match(subTitleRegexp)[0]
            .replace('[', '')
            .replace(']', '')
            .trim()
        }

        p.title = post.title.trim();
        if (p.subTitle !== '') {
            p.title = p.title.replace(subTitleRegexp, '').trim()
        }

        p.body = post.body;
        const postImages = post.body.match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/);
		p.mainImage = !!postImages ? postImages[1] : ''
        
        p.user = {
            username: post.user.login,
            name: this.#authorUsernames[post.user.login] || post.user.login,
            avatar_url: post.user.avatar_url,
            page: post.user.html_url,
        };
        p.createdAt = post.created_at;
        p.publishedAt = post.closed_at;

        const d = (new Date(post.closed_at)).toLocaleDateString().split('/');
        p.formattedPublishedAt = `${d[2]}-${d[0] > 9 ? d[0] : '0'+d[0]}-${d[1] > 9 ? d[1] : '0'+d[1]}`;
        p.categories = [];
        if (post.labels.length > 0) {
            p.categories = post.labels.map(lbl => ({ 
                id: lbl.id, 
                name: lbl.name, 
                color: `#${lbl.color}`,
                description: lbl.description,
            }))
        }
        return p
    }

    #fetchPostsByPage(page = 1, perPage = 10) {
        return new Promise((resolve, reject) => {
            const headers = {
                'accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'user-agent': 'request'
            }
            if (this.#repoPAT) {
                headers['authorization'] = `Bearer ${this.#repoPAT}`
            }

            const req = https.get(
                `https://api.github.com/repos/${this.#githubRepositoryAddress}/issues?state=closed&page=${page}&per_page=${perPage}`, 
                {
                    headers: headers,
                    timeout: 15 * 1000, // 15s
                    method: 'GET',
                },
                (res) => {
                    if (res.statusCode < 200 || res.statusCode > 299) {
                        return reject(new Error(`HTTP status code ${res.statusCode}`))
                    }
                
                    const body = []
                    res.on('data', (chunk) => body.push(chunk))
                    res.on('end', () => {
                        const resString = JSON.parse(Buffer.concat(body).toString())
                        resolve(resString)
                    })
            })
                  
            req.on('error', (err) => {
                reject(err)
            })
        
            req.on('timeout', () => {
            req.destroy()
                reject(new Error('Request time out'))
            })
        })
    }
}
