const detectChromium = () => (
	Math.acos(0.123) == 1.4474840516030247 &&
	Math.acosh(Math.SQRT2) == 0.881373587019543 &&
	Math.atan(2) == 1.1071487177940904 &&
	Math.atanh(0.5) == 0.5493061443340548 &&
	Math.cbrt(Math.PI) == 1.4645918875615231 &&
	Math.cos(21*Math.LN2) == -0.4067775970251724 &&
	Math.cosh(492*Math.LOG2E) == 9.199870313877772e+307 &&
	Math.expm1(1) == 1.718281828459045 &&
	Math.hypot(6*Math.PI, -100) == 101.76102278593319 &&
	Math.log10(Math.PI) == 0.4971498726941338 &&
	Math.sin(Math.PI) == 1.2246467991473532e-16 &&
	Math.sinh(Math.PI) == 11.548739357257748 &&
	Math.tan(10*Math.LOG2E) == -3.3537128705376014 &&
	Math.tanh(0.123) == 0.12238344189440875 &&
	Math.pow(Math.PI, -100) == 1.9275814160560204e-50
)

const getNewObjectToStringTypeErrorLie = apiFunction => {
	try {
		Object.create(apiFunction).toString()
		return true
	} catch (error) {
		const stackLines = error.stack.split('\n')
		const traceLines = stackLines.slice(1)
		const objectApply = /at Object\.apply/
		const functionToString = /at Function\.toString/
		const validLines = !traceLines.find(line => objectApply.test(line))
		// Stack must be valid
		const validStack = (
			error.constructor.name == 'TypeError' && stackLines.length > 1
		)
		// Chromium must throw error 'at Function.toString' and not 'at Object.apply'
		const isChrome = 'chrome' in window || detectChromium()
		if (validStack && isChrome && (!functionToString.test(stackLines[1]) || !validLines)) {
			return true
		}
		return !validStack
	}
}


export const getHeadlessFeatures = imports => {

	const {
		require: {
			parentPhantom,
			hashMini,
			captureError,
			logTestResult
		}
	} = imports

	return new Promise(async resolve => {
		try {
			const start = performance.now()
			const isChrome = detectChromium()
			const mimeTypes = Object.keys({...navigator.mimeTypes})
			const data = {
				chromium: isChrome,
				likeHeadless: {
					['trust token is unsupported']: (
						!('hasTrustToken' in document) ||
						!('trustTokenOperationError' in XMLHttpRequest.prototype) ||
						!('setTrustToken' in XMLHttpRequest.prototype) ||
						!('trustToken' in HTMLIFrameElement.prototype)
					),
					['navigator.webdriver is on']: 'webdriver' in navigator && !!navigator.webdriver,
					['chrome plugins is empty']: isChrome && navigator.plugins.length === 0,
					['chrome mimeTypes is empty']: isChrome && mimeTypes.length === 0,
					['notification permission is denied']: Notification.permission == 'denied',
					['system color ActiveText is rgb(255, 0, 0)']: (() => {
						let rendered = parentPhantom
						if (!parentPhantom) {
							rendered = document.createElement('div')
							document.body.appendChild(rendered)
						}
						rendered.setAttribute('style', `background-color: ActiveText`)
						const { backgroundColor: activeText } = getComputedStyle(rendered)
						if (!parentPhantom) {
							rendered.parentNode.removeChild(rendered)
						}
						return isChrome && activeText === 'rgb(255, 0, 0)'
					})(parentPhantom),
					['prefers light color scheme']: matchMedia('(prefers-color-scheme: light)').matches
				},
				headless: {
					['chrome window.chrome is undefined']: isChrome && !('chrome' in window),
					['userAgent HeadlessChrome']: (
						/HeadlessChrome/.test(navigator.userAgent) ||
						/HeadlessChrome/.test(navigator.appVersion)
					)
				},
				stealth: {
					['srcdoc throws an error']: (() => {
						try {
							const { srcdoc } = document.createElement('iframe')
							return !!srcdoc
						}
						catch (error) {
							return true
						}
					})(),
					['srcdoc triggers a window Proxy']: (() => {
						const iframe = document.createElement('iframe')
						iframe.srcdoc = '' + hashMini(crypto.getRandomValues(new Uint32Array(10)))
						return !!iframe.contentWindow
					})(),
					['index of chrome is too high']: (() => {
						const control = (
							'cookieStore' in window ? 'cookieStore' :
							'ondevicemotion' in window ? 'ondevicemotion' :
							'speechSynthesis'
						)
						const propsInWindow = []
						for (const prop in window) { propsInWindow.push(prop) }
						const chromeIndex = propsInWindow.indexOf('chrome')
						const controlIndex = propsInWindow.indexOf(control)
						return chromeIndex > controlIndex
					})(),
					['toString Proxy exposes an invalid TypeError']: (() => {
						const liedToString = (
							getNewObjectToStringTypeErrorLie(Function.prototype.toString) ||
							getNewObjectToStringTypeErrorLie(() => {})
						)
						return liedToString
					})()
				}
			}

			const { likeHeadless, headless, stealth } = data
			const likeHeadlessKeys = Object.keys(likeHeadless)
			const headlessKeys = Object.keys(headless)
			const stealthKeys = Object.keys(stealth)
			
			const likeHeadlessRating = ((likeHeadlessKeys.filter(key => likeHeadless[key]).length / likeHeadlessKeys.length) * 100).toFixed(0)
			const headlessRating = ((headlessKeys.filter(key => headless[key]).length / headlessKeys.length) * 100).toFixed(0)
			const stealthRating = ((stealthKeys.filter(key => stealth[key]).length / stealthKeys.length) * 100).toFixed(0)

			logTestResult({ start, test: 'headless', passed: true })
			return resolve({ ...data, likeHeadlessRating, headlessRating, stealthRating })
		}
		catch (error) {
			logTestResult({ test: 'headless', passed: false })
			captureError(error)
			return resolve()
		}
	})
}