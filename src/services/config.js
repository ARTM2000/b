import fs from 'fs'
import yaml from 'yaml'

export class Config {
    #fullRepoName
    #content
    #authorUsernames
    #repoPAT

    /**
     * @param {string} configPath 
     */
    constructor(configPath) {
        const configFileContent = fs.readFileSync(configPath, 'utf8')
        const data = yaml.parse(configFileContent)
        this.#setFullRepoName(data)
        this.#setContent(data)
        this.#setAuthorUsernames(data)
        this.#setRepoPAT(data)
    }

    #setRepoPAT(data) {
        if (data.repo_pat) {
            this.#repoPAT = data.repo_pat;
            return;
        }
        
        this.#repoPAT = null
    }

    getRepoPAT() {
        return this.#repoPAT;
    }

    #setAuthorUsernames(data) {
        this.#authorUsernames = data.author_usernames
    }

    /**
     * @returns {object}
     */
    getAuthorUsernames() {
        if (this.#authorUsernames && Object.keys(this.#authorUsernames).length > 0) {
            return this.#authorUsernames;
        }
        return {}
    }

    #setFullRepoName(data) {
        this.#fullRepoName = data.full_repo_name
    }

    /**
     * @returns {string}
     */
    getFullRepoName() {
        return this.#fullRepoName;
    }

    #setContent(data) {
        const content = {}
        // use this way for fields declaration
        content.introduction = data.content.introduction
        content.pageTitle = data.content.page_title
        content.metaTitle = data.content.page_title
        content.metaImage = '';
        content.metaUrl = data.domain
        content.domain = data.domain

        this.#content = content
    }

    /**
     * @returns {object}
     */
    getContent() {
        return this.#content;
    }
}
