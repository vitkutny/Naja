export default class UIHandler {
	selector = '.ajax';
	allowedOrigins = [];

	constructor(naja) {
		this.naja = naja;

		const handler = this.handleUI.bind(this);
		naja.addEventListener('load', this.bindUI.bind(this, handler));

		// window.location.origin is not supported in IE 10
		const origin = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
		this.allowedOrigins.push(origin);
	}

	bindUI(handler) {
		const selectors = [
			`a${this.selector}`,
			`input[type="submit"]${this.selector}`,
			`input[type="image"]${this.selector}`,
			`button[type="submit"]${this.selector}`,
			`form${this.selector} input[type="submit"]`,
			`form${this.selector} input[type="image"]`,
			`form${this.selector} button[type="submit"]`,
		].join(', ');

		const elements = document.querySelectorAll(selectors);
		for (let i = 0; i < elements.length; i++) {
			const node = elements.item(i);
			node.removeEventListener('click', handler);
			node.addEventListener('click', handler);
		}

		const forms = document.querySelectorAll(`form${this.selector}`);
		for (let i = 0; i < forms.length; i++) {
			const form = forms.item(i);
			form.removeEventListener('submit', handler);
			form.addEventListener('submit', handler);
		}
	}

	handleUI(evt) {
		if (evt.altKey || evt.ctrlKey || evt.shiftKey || evt.metaKey || evt.button) {
			return;
		}

		const el = evt.currentTarget, options = {};

		if (evt.type === 'submit') {
			this.submitForm(el, options, evt);

		} else if (evt.type === 'click') {
			this.clickElement(el, options, evt);
		}
	}

	clickElement(el, options = {}, evt) {
		let method, url, data;

		if ( ! this.naja.fireEvent('interaction', {element: el, originalEvent: evt, options})) {
			if (evt) {
				evt.preventDefault();
			}

			return;
		}

		if (el.tagName.toLowerCase() === 'a') {
			method = 'GET';
			url = el.href;
			data = null;

		} else if (el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'button') {
			const {form} = el;
			method = form.method ? form.method.toUpperCase() : 'GET';
			url = form.action || window.location.pathname + window.location.search;
			data = new FormData(form);

			if (el.type === 'submit' || el.tagName.toLowerCase() === 'button') {
				data.append(el.name, el.value || '');

			} else if (el.type === 'image') {
				const coords = el.getBoundingClientRect();
				data.append(`${el.name}.x`, Math.max(0, Math.floor(evt.pageX - coords.left)));
				data.append(`${el.name}.y`, Math.max(0, Math.floor(evt.pageY - coords.top)));
			}
		}

		if (this.isUrlAllowed(url)) {
			if (evt) {
				evt.preventDefault();
			}

			this.naja.makeRequest(method, url, data, options);
		}
	}

	submitForm(form, options = {}, evt) {
		if ( ! this.naja.fireEvent('interaction', {element: form, originalEvent: evt, options})) {
			if (evt) {
				evt.preventDefault();
			}

			return;
		}

		const method = form.method ? form.method.toUpperCase() : 'GET';
		const url = form.action || window.location.pathname + window.location.search;
		const data = new FormData(form);

		if (this.isUrlAllowed(url)) {
			if (evt) {
				evt.preventDefault();
			}

			this.naja.makeRequest(method, url, data, options);
		}
	}

	isUrlAllowed(url) {
		// ignore non-URL URIs (javascript:, data:, ...)
		if (/^(?!https?)[^:/?#]+:/i.test(url)) {
			return false;
		}

		return ! /^https?/i.test(url) || this.allowedOrigins.some((origin) => new RegExp(`^${origin}`, 'i').test(url));
	}
}
