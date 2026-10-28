Every .js file in this folder is mounted automatically by routes/index.js.
Each file exports { mount, router }, for example:

    module.exports = { mount: "/listings", router };

Feature files therefore never need to edit routes/index.js, which avoids merge conflicts.
