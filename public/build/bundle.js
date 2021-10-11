
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\svelte-xq\buttons\ToggleButton.svelte generated by Svelte v3.43.1 */

    const file$2 = "src\\svelte-xq\\buttons\\ToggleButton.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let span;
    	let input;
    	let t;
    	let label;
    	let span_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			input = element("input");
    			t = space();
    			label = element("label");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "switcher");
    			attr_dev(input, "class", "svelte-1w6sq5k");
    			add_location(input, file$2, 235, 8, 6488);
    			attr_dev(label, "for", "switcher");
    			attr_dev(label, "class", "svelte-1w6sq5k");
    			add_location(label, file$2, 236, 8, 6535);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty('switcher ' + ['switcher', /*style*/ ctx[0]].filter(Boolean).join('-')) + " svelte-1w6sq5k"));
    			add_location(span, file$2, 234, 4, 6404);
    			attr_dev(div, "class", "btn-toggle svelte-1w6sq5k");
    			add_location(div, file$2, 233, 0, 6355);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, input);
    			append_dev(span, t);
    			append_dev(span, label);

    			if (!mounted) {
    				dispose = listen_dev(
    					div,
    					"click",
    					function () {
    						if (is_function(/*onClick*/ ctx[1])) /*onClick*/ ctx[1].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*style*/ 1 && span_class_value !== (span_class_value = "" + (null_to_empty('switcher ' + ['switcher', /*style*/ ctx[0]].filter(Boolean).join('-')) + " svelte-1w6sq5k"))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ToggleButton', slots, []);
    	let { style } = $$props;
    	let { onClick } = $$props;
    	const writable_props = ['style', 'onClick'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ToggleButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('style' in $$props) $$invalidate(0, style = $$props.style);
    		if ('onClick' in $$props) $$invalidate(1, onClick = $$props.onClick);
    	};

    	$$self.$capture_state = () => ({ style, onClick });

    	$$self.$inject_state = $$props => {
    		if ('style' in $$props) $$invalidate(0, style = $$props.style);
    		if ('onClick' in $$props) $$invalidate(1, onClick = $$props.onClick);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [style, onClick];
    }

    class ToggleButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { style: 0, onClick: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToggleButton",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*style*/ ctx[0] === undefined && !('style' in props)) {
    			console.warn("<ToggleButton> was created without expected prop 'style'");
    		}

    		if (/*onClick*/ ctx[1] === undefined && !('onClick' in props)) {
    			console.warn("<ToggleButton> was created without expected prop 'onClick'");
    		}
    	}

    	get style() {
    		throw new Error("<ToggleButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<ToggleButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onClick() {
    		throw new Error("<ToggleButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClick(value) {
    		throw new Error("<ToggleButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\svelte-xq\social\IconBar.svelte generated by Svelte v3.43.1 */

    const file$1 = "src\\svelte-xq\\social\\IconBar.svelte";

    function create_fragment$1(ctx) {
    	let link;
    	let t0;
    	let div2;
    	let div1;
    	let div0;
    	let ul;
    	let a0;
    	let li0;
    	let i0;
    	let a0_href_value;
    	let t1;
    	let a1;
    	let li1;
    	let i1;
    	let a1_href_value;
    	let t2;
    	let a2;
    	let li2;
    	let i2;
    	let a2_href_value;
    	let t3;
    	let a3;
    	let li3;
    	let i3;
    	let a3_href_value;
    	let div2_class_value;

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			ul = element("ul");
    			a0 = element("a");
    			li0 = element("li");
    			i0 = element("i");
    			t1 = space();
    			a1 = element("a");
    			li1 = element("li");
    			i1 = element("i");
    			t2 = space();
    			a2 = element("a");
    			li2 = element("li");
    			i2 = element("i");
    			t3 = space();
    			a3 = element("a");
    			li3 = element("li");
    			i3 = element("i");
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css");
    			add_location(link, file$1, 43, 0, 1049);
    			attr_dev(i0, "class", "fa fa-linkedin");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file$1, 48, 61, 1367);
    			attr_dev(li0, "class", "svelte-19jo3cb");
    			add_location(li0, file$1, 48, 57, 1363);
    			attr_dev(a0, "href", a0_href_value = /*links*/ ctx[0].linkedin);
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$1, 48, 16, 1322);
    			attr_dev(i1, "class", "fa fa-twitter");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file$1, 49, 60, 1487);
    			attr_dev(li1, "class", "svelte-19jo3cb");
    			add_location(li1, file$1, 49, 56, 1483);
    			attr_dev(a1, "href", a1_href_value = /*links*/ ctx[0].twitter);
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$1, 49, 16, 1443);
    			attr_dev(i2, "class", "fa fa-instagram");
    			attr_dev(i2, "aria-hidden", "true");
    			add_location(i2, file$1, 50, 62, 1608);
    			attr_dev(li2, "class", "svelte-19jo3cb");
    			add_location(li2, file$1, 50, 58, 1604);
    			attr_dev(a2, "href", a2_href_value = /*links*/ ctx[0].instagram);
    			attr_dev(a2, "target", "_blank");
    			add_location(a2, file$1, 50, 16, 1562);
    			attr_dev(i3, "class", "fa fa-github");
    			attr_dev(i3, "aria-hidden", "true");
    			add_location(i3, file$1, 51, 59, 1728);
    			attr_dev(li3, "class", "svelte-19jo3cb");
    			add_location(li3, file$1, 51, 55, 1724);
    			attr_dev(a3, "href", a3_href_value = /*links*/ ctx[0].github);
    			attr_dev(a3, "target", "_blank");
    			add_location(a3, file$1, 51, 16, 1685);
    			attr_dev(ul, "class", "social svelte-19jo3cb");
    			add_location(ul, file$1, 47, 12, 1285);
    			attr_dev(div0, "id", "social-test");
    			attr_dev(div0, "class", "svelte-19jo3cb");
    			add_location(div0, file$1, 46, 8, 1249);
    			attr_dev(div1, "class", "center svelte-19jo3cb");
    			add_location(div1, file$1, 45, 4, 1219);
    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty(['style', /*style*/ ctx[1]].filter(Boolean).join('-')) + " svelte-19jo3cb"));
    			add_location(div2, file$1, 44, 0, 1157);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, link, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, ul);
    			append_dev(ul, a0);
    			append_dev(a0, li0);
    			append_dev(li0, i0);
    			append_dev(ul, t1);
    			append_dev(ul, a1);
    			append_dev(a1, li1);
    			append_dev(li1, i1);
    			append_dev(ul, t2);
    			append_dev(ul, a2);
    			append_dev(a2, li2);
    			append_dev(li2, i2);
    			append_dev(ul, t3);
    			append_dev(ul, a3);
    			append_dev(a3, li3);
    			append_dev(li3, i3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*links*/ 1 && a0_href_value !== (a0_href_value = /*links*/ ctx[0].linkedin)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty & /*links*/ 1 && a1_href_value !== (a1_href_value = /*links*/ ctx[0].twitter)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty & /*links*/ 1 && a2_href_value !== (a2_href_value = /*links*/ ctx[0].instagram)) {
    				attr_dev(a2, "href", a2_href_value);
    			}

    			if (dirty & /*links*/ 1 && a3_href_value !== (a3_href_value = /*links*/ ctx[0].github)) {
    				attr_dev(a3, "href", a3_href_value);
    			}

    			if (dirty & /*style*/ 2 && div2_class_value !== (div2_class_value = "" + (null_to_empty(['style', /*style*/ ctx[1]].filter(Boolean).join('-')) + " svelte-19jo3cb"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('IconBar', slots, []);
    	let { links } = $$props;
    	let { style } = $$props;
    	const writable_props = ['links', 'style'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<IconBar> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('links' in $$props) $$invalidate(0, links = $$props.links);
    		if ('style' in $$props) $$invalidate(1, style = $$props.style);
    	};

    	$$self.$capture_state = () => ({ links, style });

    	$$self.$inject_state = $$props => {
    		if ('links' in $$props) $$invalidate(0, links = $$props.links);
    		if ('style' in $$props) $$invalidate(1, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [links, style];
    }

    class IconBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { links: 0, style: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IconBar",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*links*/ ctx[0] === undefined && !('links' in props)) {
    			console.warn("<IconBar> was created without expected prop 'links'");
    		}

    		if (/*style*/ ctx[1] === undefined && !('style' in props)) {
    			console.warn("<IconBar> was created without expected prop 'style'");
    		}
    	}

    	get links() {
    		throw new Error("<IconBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set links(value) {
    		throw new Error("<IconBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<IconBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<IconBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const constants = {
        tabsData: [
            {
                text: 'Home',
                link: '#'
            },
            {
                text: 'Tweet this',
                link: '#'
            },
            {
                text: 'Blog',
                link: '#'
            },
            {
                text: 'Contact Me',
                link: '#'
            },
        ],
        socialLinks: {
            linkedin: 'https://www.linkedin.com/in/aditya-vivek-thota/',
            twitter: 'https://twitter.com/xq_is_here',
            instagram: 'https://instagram.com/xq_is_here',
            github: 'https://github.com/aditya-xq',
        },
    };

    /* src\App.svelte generated by Svelte v3.43.1 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let togglebutton;
    	let t2;
    	let div1;
    	let iconbar;
    	let t3;
    	let div2;
    	let current;

    	togglebutton = new ToggleButton({
    			props: { style: "sliderbox", onClick: toggle },
    			$$inline: true
    		});

    	iconbar = new IconBar({
    			props: {
    				style: "minimal",
    				links: constants.socialLinks
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = `${'Hello world! XQ here :P'}`;
    			t1 = space();
    			div0 = element("div");
    			create_component(togglebutton.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			create_component(iconbar.$$.fragment);
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = `${'Stay tuned for the updated website'}`;
    			attr_dev(h1, "class", "title svelte-c6vg5z");
    			add_location(h1, file, 27, 4, 551);
    			add_location(div0, file, 28, 4, 607);
    			add_location(div1, file, 29, 4, 674);
    			attr_dev(div2, "class", "content svelte-c6vg5z");
    			add_location(div2, file, 30, 4, 747);
    			add_location(main, file, 26, 0, 539);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			mount_component(togglebutton, div0, null);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			mount_component(iconbar, div1, null);
    			append_dev(main, t3);
    			append_dev(main, div2);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(togglebutton.$$.fragment, local);
    			transition_in(iconbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(togglebutton.$$.fragment, local);
    			transition_out(iconbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(togglebutton);
    			destroy_component(iconbar);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toggle() {
    	window.document.body.classList.toggle('dark-mode');
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ToggleButton, IconBar, constants, toggle });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
