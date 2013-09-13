/**
 * Global viewer object - engine for application.
 *
 * Required:
 *  hid.js
 *  basic.js
 */
var gv = new function() {

    var LAST_NODE_ID = 0;

    this.world = {

    };

    var dom = new function() {

        this.element = function(id) {
            return document.getElementById(id);
        };

        this.getWorld = function() {
            return this.element("gv-nodesContainer");
        };

        this.attachLink = function() {
            var link = document.createElement("div");
            link.className = "gv-link";
            this.getWorld().appendChild(link);
            return link;
        };

    };

    var handlers = {
        nodeMove: function(pointer) {
            this.style.left = pointer.x - this.clientWidth/2 + "px";
            this.style.top = pointer.y - this.clientHeight/2 + "px";
        }
    };

    var addNode = function(id, name) {



    };

    var Node = function(name) {

        this.name = name;
        this.nodeName = name;
        this.parent = {};
        this.child = {};
        this.x = 0;
        this.y = 0;
        this.r = 0;
        this.domElement = null;
        this.id = LAST_NODE_ID++;
        gv.world.append(this);

    };

    Node.prototype = {

        domElement: null,
        name: "",
        nodeName: "",
        id: -1,
        x: 0,
        y: 0,
        r: 0,
        physics: { // proto
            distance: 0,
            angle: 0,
            timer: 0
        },
        parent: {},
        child: {},
        check: function(node) {
            return node instanceof Node;
        },
        addChild: function(node) {
            if (!this.check(node)) return;
            var link = dom.attachLink();
            this.parent.append({
                node: this,
                linkElement: link
            });
            node.child.append({
                node: node,
                linkElement: link
            });
        },
        physicsStep: function(obj) {
            obj.x += obj.physics.distance*Math.cos(Math.PI/2-obj.physics.angle)/2;
            obj.y += obj.physics.distance*Math.sin(Math.PI/2-obj.physics.angle)/2;
            obj.physics.distance /= 2;
            obj.update();
            if (obj.physics.distance < 1) {
                clearInterval(obj.physics.timer);
                obj.physics.timer = 0;
            }
        },
        // todo check for existence
        addParent: function(node) {
            if (!this.check(node)) return;
            var link = dom.attachLink();
            this.parent.append({
                node: node,
                linkElement: link
            });
            node.child.append({
                node: this,
                linkElement: link
            });
        },
        slide: function(a) { // make as light as possible
            //if (!a || !b) return;
            var b = this, dx = a.x - b.x, dy = a.y - b.y, l = Math.sqrt(dx*dx + dy*dy) - 10;
            if (l > a.r + b.r) return; // not colliding
            var f = (a.r + b.r - l)/10, d = Math.PI/2 - Math.atan2(dx, dy),
                fx = f*Math.cos(d), fy = f*Math.sin(d);
            a.x += fx; b.x -= fx;
            a.y += fy; b.y -= fy;
            if (Math.abs(fx) + Math.abs(fy) > 0.001) setTimeout(function(){a.slide(b)}, 25);
            a.updateView();
        },
        updateView: function() {
            if (!this.domElement) return;
            this.domElement.style.left = this.x - this.r + "px";
            this.domElement.style.top = this.y - this.r + "px";
            var i = this;
            var updateLink = function(property) {
                var l = this[property].linkElement;
                var o = this[property].node;
                var or = o.r;
                var ir = i.r;
                var dx = o.x - i.x;
                var dy = o.y - i.y;
                var len = Math.sqrt(dx*dx + dy*dy) - ir - or + 1;
                var dir = Math.PI/2 - Math.atan2(o.x - i.x, o.y - i.y);
                l.style["transform"] = l.style["-ms-transform"] = l.style["-o-transform"] = l.style["-moz-transform"] =
                    l.style["-webkit-transform"] = "rotate("+dir+"rad)";
                l.style.width = Math.max(len, 0) + "px";
                l.style.left = (o.x - or*Math.cos(dir) + i.x + ir*Math.cos(dir))/2 - len/2 + "px";
                l.style.top = (o.y - or*Math.sin(dir) + i.y + ir*Math.sin(dir))/2 - l.clientHeight/2 - 1 + "px";
            };
            this.child.foreach(updateLink);
            this.parent.foreach(updateLink);
        },
        /**
         * Updates node position.
         */
        update: function() {
            var me = this;
            this.parent.foreach(function(you){
                me.slide(this[you].node)
            });
            this.child.foreach(function(you){
                me.slide(this[you].node)
            });
            this.updateView();
        },
        _moveHandler: function(pointer) {
            this._parentNode.x = pointer.x; this._parentNode.y = pointer.y;
            this._parentNode.update();
        },
        _clickHandler: function() {
            var i = this;
            server.post("data",function(data){
                try {eval("data = " + data)} catch(e) {}
                i._parentNode.demo_expand(data)
            }, this._parentNode.getTreePath());
        },
        getTreePath: function() {

            var path = [];

            var fall = function(node) {
                path.push(node.nodeName);
                if (node.parent["0"]) {
                    fall(node.parent["0"].node);
                }
            };

            fall(this);

            return path.reverse();

        },
        attachToScene: function() {
            var node = document.createElement("div");
            node.className = "gv-node";
            node._parentNode = this;
            node.id = "node" + this.id;
            var span = document.createElement("div");
            span.innerHTML = this.name;
            dom.getWorld().appendChild(node);
            node.appendChild(span);
            var w = span.clientWidth + 10;
            var sh = span.clientHeight;
            node.style.width = node.style.height = w + "px";
            span.style.marginTop = w/2 - sh/2 + "px";
            this.r = (node.clientWidth + 2)/2;
            hid.bindPointer("move", node, this._moveHandler);
            hid.bindPointer("click", node, this._clickHandler);
            this.domElement = node;
            this.update();
        },
        demo_expand: function(testObj) {
            if (!testObj || !testObj.status || !testObj.children) return;
            var i = this;
            var n = 0, c = 0;
            testObj.children.foreach(function(){n++});
            testObj.children.foreach(function(p){
                var it = this[p];
                var node = gv.createNode(it.n);
                var d = c*Math.PI*2/n;
                node.x = i.x + Math.cos(d)*50; node.y = i.y + Math.sin(d)*50;
                node.addParent(i);
                node.attachToScene();
                c++;
            })
        }

    };

    this.createNode = function(label) {
        return new Node(label);
    };

    this.initialize = function() {

        if (hid) hid.initialize();
        if (server) server.initialize();

        var node = this.createNode("user");
        node.x = 300;
        node.y = 300;
        node.attachToScene();

    };

};
