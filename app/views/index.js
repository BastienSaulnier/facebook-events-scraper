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

module.exports = router;
