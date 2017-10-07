import mockNaja from './setup/mockNaja';
import {assert} from 'chai';
import sinon from 'sinon';

import UIHandler from '../src/core/UIHandler';


describe('UIHandler', function () {
	beforeEach(function () {
		// a.ajax
		this.a = document.createElement('a');
		this.a.href = '/UIHandler/a';
		this.a.classList.add('ajax');
		document.body.appendChild(this.a);

		// form.ajax
		this.form = document.createElement('form');
		this.form.method = 'POST';
		this.form.action = '/UIHandler/form';
		this.form.classList.add('ajax');
		document.body.appendChild(this.form);

		// form input[type="submit"].ajax
		this.form2 = document.createElement('form');
		this.form2.action = '/UIHandler/submit';
		this.input = document.createElement('input');
		this.input.type = 'submit';
		this.input.name = 'submit';
		this.input.classList.add('ajax');
		this.form2.appendChild(this.input);
		document.body.appendChild(this.form2);

		// form input[type="image"].ajax
		this.form3 = document.createElement('form');
		this.form3.action = '/UIHandler/image';
		this.image = document.createElement('input');
		this.image.type = 'image';
		this.image.name = 'image';
		this.image.classList.add('ajax');
		this.form3.appendChild(this.image);
		document.body.appendChild(this.form3);
	});

	afterEach(function () {
		document.body.removeChild(this.a);
		document.body.removeChild(this.form);
		document.body.removeChild(this.form2);
		document.body.removeChild(this.form3);
	});

	it('constructor()', function () {
		const naja = mockNaja();
		const mock = sinon.mock(naja);
		mock.expects('addEventListener')
			.withExactArgs('load', sinon.match.instanceOf(Function))
			.once();

		new UIHandler(naja);
		mock.verify();
	});

	describe('bindUI()', function () {
		const createEvent = (type) => {
			if (typeof(Event) === 'function') {
				return new Event(type, {
					bubbles: true,
					cancelable: true,
				});

			} else {
				const event = document.createEvent('Event');
				event.initEvent(type, true, true);
				return event;
			}
		};

		it('binds to .ajax elements by default', function () {
			const spy = sinon.spy((e) => e.preventDefault());

			const handler = new UIHandler(mockNaja());
			handler.bindUI(spy);

			this.a.dispatchEvent(createEvent('click'));
			this.form.dispatchEvent(createEvent('submit'));
			this.input.dispatchEvent(createEvent('click'));

			assert.isTrue(spy.calledThrice);
		});

		it('binds to elements specified by custom selector', function () {
			const customSelectorLink = document.createElement('a');
			customSelectorLink.href = '/UIHandler/customSelector';
			customSelectorLink.setAttribute('data-naja', true);
			document.body.appendChild(customSelectorLink);

			const spy = sinon.spy((e) => e.preventDefault());
			const handler = new UIHandler(mockNaja());
			handler.selector = '[data-naja]';
			handler.bindUI(spy);

			customSelectorLink.dispatchEvent(createEvent('click'));
			assert.isTrue(spy.called);
		});
	});

	describe('handleUI()', function () {
		it('modifier keys should abort request', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.never();

			const handler = new UIHandler(naja);

			const evt = {
				type: 'click',
				currentTarget: this.a,
				button: 2,
			};
			handler.handleUI(evt);

			const evt2 = {
				type: 'click',
				currentTarget: this.a,
				ctrlKey: true,
			};
			handler.handleUI(evt2);

			mock.verify();
		});

		it('request for a non-URL URI should not be dispatched', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.never();

			const handler = new UIHandler(naja);

			const voidLink = document.createElement('a');
			voidLink.href = 'javascript:void(0)';
			voidLink.classList.add('ajax');
			document.body.appendChild(voidLink);

			const evt = {
				type: 'click',
				currentTarget: voidLink,
			};
			handler.handleUI(evt);

			mock.verify();
			document.body.removeChild(voidLink);
		});

		it('request for an absolute URL with same origin should be dispatched', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://localhost:9876/UIHandler/sameOrigin', null, {})
				.once();

			const handler = new UIHandler(naja);

			const externalLink = document.createElement('a');
			externalLink.href = 'http://localhost:9876/UIHandler/sameOrigin';
			externalLink.classList.add('ajax');
			document.body.appendChild(externalLink);

			const preventDefault = sinon.spy();
			const evt = {
				type: 'click',
				currentTarget: externalLink,
				preventDefault,
			};
			handler.handleUI(evt);

			mock.verify();
			assert.isTrue(preventDefault.called);
			document.body.removeChild(externalLink);
		});

		it('request for an external URL with allowed origin should be dispatched', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://another-site.com/foo', null, {})
				.once();

			const handler = new UIHandler(naja);
			handler.allowedOrigins.push('http://another-site.com');

			const externalLink = document.createElement('a');
			externalLink.href = 'http://another-site.com/foo';
			externalLink.classList.add('ajax');
			document.body.appendChild(externalLink);

			const preventDefault = sinon.spy();
			const evt = {
				type: 'click',
				currentTarget: externalLink,
				preventDefault,
			};
			handler.handleUI(evt);

			mock.verify();
			assert.isTrue(preventDefault.called);
			document.body.removeChild(externalLink);
		});

		it('request for an external URL with disallowed origin should not be dispatched', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.never();

			const handler = new UIHandler(naja);

			const externalLink = document.createElement('a');
			externalLink.href = 'https://google.com';
			externalLink.classList.add('ajax');
			document.body.appendChild(externalLink);

			const evt = {
				type: 'click',
				currentTarget: externalLink,
			};
			handler.handleUI(evt);

			mock.verify();
			document.body.removeChild(externalLink);
		});

		it('triggers interaction event', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://localhost:9876/UIHandler/a', null, {})
				.once();

			const listener = sinon.spy();
			naja.addEventListener('interaction', listener);

			const handler = new UIHandler(naja);

			const evt = {
				type: 'click',
				currentTarget: this.a,
				preventDefault: () => true,
			};
			handler.handleUI(evt);

			assert.isTrue(listener.calledWithMatch(sinon.match.object
				.and(sinon.match.has('element', this.a))
				.and(sinon.match.has('originalEvent', evt))
			));

			mock.verify();
		});

		it('interaction event listener can abort request', function () {
			const naja = mockNaja();
			naja.addEventListener('interaction', evt => evt.preventDefault());

			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.never();

			const handler = new UIHandler(naja);

			const evt = {
				type: 'click',
				currentTarget: this.a,
				preventDefault: () => undefined,
			};
			handler.handleUI(evt);

			mock.verify();
		});

		it('interaction event listener can alter options', function () {
			const naja = mockNaja();
			naja.addEventListener('interaction', ({options}) => {
				options.foo = 42;
			});

			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://localhost:9876/UIHandler/a', null, {foo: 42})
				.once();

			const handler = new UIHandler(naja);

			const evt = {
				type: 'click',
				currentTarget: this.a,
				preventDefault: () => true,
			};
			handler.handleUI(evt);

			mock.verify();
		});

		it('a.ajax', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://localhost:9876/UIHandler/a', null, {})
				.once();

			const handler = new UIHandler(naja);

			const preventDefault = sinon.spy();
			const evt = {
				type: 'click',
				currentTarget: this.a,
				preventDefault,
			};
			handler.handleUI(evt);

			assert.isTrue(preventDefault.called);
			mock.verify();
		});

		it('form.ajax', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			mock.expects('makeRequest')
				.withExactArgs('POST', 'http://localhost:9876/UIHandler/form', sinon.match.instanceOf(FormData), {})
				.once();

			const handler = new UIHandler(naja);

			const preventDefault = sinon.spy();
			const evt = {
				type: 'submit',
				currentTarget: this.form,
				preventDefault,
			};
			handler.handleUI(evt);

			assert.isTrue(preventDefault.called);
			mock.verify();
		});

		it('form input[type="submit"].ajax', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			const containsSubmit = sinon.match((value) => {
				// some browsers have no way of getting data *out* from FormData
				return 'has' in value ? value.has('submit') : true;
			});

			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://localhost:9876/UIHandler/submit', sinon.match.instanceOf(FormData).and(containsSubmit), {})
				.once();

			const handler = new UIHandler(naja);

			const preventDefault = sinon.spy();
			const evt = {
				type: 'click',
				currentTarget: this.input,
				preventDefault,
			};
			handler.handleUI(evt);

			assert.isTrue(preventDefault.called);
			mock.verify();
		});

		it('form input[type="image"].ajax', function () {
			const naja = mockNaja();
			const mock = sinon.mock(naja);
			const containsImage = sinon.match((value) => {
				// some browsers have no way of getting data *out* from FormData
				return 'has' in value ? (value.has('image.x') && value.has('image.y')) : true;
			});

			mock.expects('makeRequest')
				.withExactArgs('GET', 'http://localhost:9876/UIHandler/image', sinon.match.instanceOf(FormData).and(containsImage), {})
				.once();

			const handler = new UIHandler(naja);

			const preventDefault = sinon.spy();
			const evt = {
				type: 'click',
				currentTarget: this.image,
				preventDefault,
			};
			handler.handleUI(evt);

			assert.isTrue(preventDefault.called);
			mock.verify();
		});
	});
});
