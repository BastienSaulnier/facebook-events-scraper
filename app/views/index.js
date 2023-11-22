const router = require('express').Router();

router.route('/').get(async (req, res, next) => {
    const params = {
        error: false,
        ended: false,
        postUrl: `${process.env.API_URL}/api/scrap`
    }

    return res.render('index', {...params})
})

router.route('/error').get(async (req, res, next) => {
    return res.render('error')
})

router.route('/download').get(async (req, res, next) => {
    console.log(JSON.parse(req.query.data))

    const params = {
        searchUrl: `${process.env.API_URL}/`
    }

    return res.render('download', {...params})
})

module.exports = router;
