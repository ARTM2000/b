import { BlogPosts } from "./services/blog-posts.js";
import { Config } from "./services/config.js";
import { Renderer } from "./services/renderer.js";

function getConfig() {
    return new Config(import.meta.dirname + '/../config.yml')
}

// fetch blog posts data from github issues
function getBlogPosts() {
    return new BlogPosts(getConfig());
}

async function renderPages() {
    const r = new Renderer(getBlogPosts(), getConfig())

    // create index.html file from ejs template
    await r.renderIndexPage()

    // create blog posts files from ejs template
    await r.renderBlogPosts()

    // create 404 page
    await r.render404Page()

    // dump data to json file for dynamic data features
    await r.dumpDataToJSON()

    // create short link page
    await r.createShortUrlLinkPage()
}

renderPages()
