ALGORITHM_MODULE.hld_module = (function chart(ALGORITHM_MODULE, d3, bootbox) {
    // alias our algorithm module -- since we are running this code from main it must be ready
    var _my = ALGORITHM_MODULE;
    if (_my == undefined) {
	throw "Algorithm module is not defined!";
    }
    var algorithmTabId = "hld-tab";
    var algorithmName = "Heavy-Light Decomposition";
    var TREE_SIZE = 15;
    /*******************************/
    /*      Setup the panels       */
    /*******************************/
    console.debug("downloaded hld");
    var layout = _my.AlgorithmUtils.setupLayout(algorithmTabId, algorithmName, "a-hld", [5, 7]);
    layout.customControlsLayout.append("button")
	.attr("class", "btn btn-default btn-sm")
	.attr("title", "Permute the tree input data. (You want to do this .. Trust me!")
        .on("click", function() {
	    d3.select("#hld-tree-group").remove();
	    initialize(createRandomTree(TREE_SIZE));
	})
	.text("Shuffle Data");
    /*********************/
    /*** HLD functions ***/
    /*********************/
    function computeSubtreeSize(tree, current_node) {
	tree[current_node].subTreeSize = 1;
	var children = tree[current_node].children;
	for (var idx = 0; idx < children.length; idx++) {
	    var sub_result = computeSubtreeSize(tree, children[idx]);
	    tree[current_node].subTreeSize += sub_result;
	}
	return tree[current_node].subTreeSize;
    }
    function heavyLightDecomposition(tree, current_node, current_chain, chains) {
	if (chains.chainHeads[current_chain] === undefined) {
	    chains.chainHeads[current_chain] = current_node;
	}
	chains.chainIdx[current_node] = current_chain;
	chains.chainPos[current_node] = chains.chainLengths[current_chain];
	chains.chainLengths[current_chain]++;
	if (tree.isLeafNode(current_node)) {
	    return;
	}
	var maxSubTreeSize = -1;
	var specialChild = -1;
	var children = tree[current_node].children;
	for (var idx = 0; idx < children.length; idx++) {
	    if (tree[children[idx]].subTreeSize > maxSubTreeSize) {
		maxSubTreeSize = tree[children[idx]].subTreeSize;
		specialChild = children[idx];
	    }
	}
	heavyLightDecomposition(tree, specialChild, current_chain, chains);
	for (var idx = 0; idx < children.length; idx++) {
	    if (children[idx] != specialChild) {
		var new_chain_num = ++chains.numChains;
		heavyLightDecomposition(tree, children[idx], new_chain_num, chains);
	    }
	}
    }
    /**********************/
    /** Visualizations  ***/
    /**********************/
    var hld_callbacks = [];
    var ss_callbacks = [];
    var margin = { left: 10, top: 30, right: 10, bottom: 100};
    var svg = d3.select("#" + algorithmTabId + " .graphics").append("svg")
	.attr("width",  "900px")
	.attr("height", "1050px")
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    function createNodes(tree) {
	var nodes = [];
	for (var i = 0; i <= tree.size; i++) {
	    nodes.push(tree[i]);
	}
	return nodes;
    }
    function createLinks(tree) {
	var links = [];
	for (var i = 0; i < tree.size; i++) {
	    var ch = tree[i].children;
	    for (var j = 0; j < ch.length; j++) {
		links.push({source: tree[i], 
			    target: tree[ch[j]]});
	    }
	}
	return links;
    }
    var radius = 20;
    function initialize(tree) {
	var tree_group = svg.append("g").attr("id", "hld-tree-group");
	var nodes = createNodes(tree);
	var links = createLinks(tree);
	var force = d3.layout.force()
	    .size([800, 700])
	    .nodes(nodes)
	    .links(links)
	    .charge(-600)
	    .linkDistance(100)
	    .gravity(0.05)
	    .start();

	var diag = d3.svg.diagonal();
	var flinks = tree_group.selectAll("hld-link")
	    .data(links)
	    .enter()
	   .append("line")
	    .attr("class", "hld-link")
	    .attr("id", function(d) { return "hld-link-from-" + d.source.idx + "-to-" + d.target.idx; });

	var fnodes = tree_group.selectAll("hld-circle")
	    .data(nodes)
	    .enter()
	   .append("g")
	    .attr("id", function(d) { return "hld-node-" + d.idx; })
	    .call(force.drag())
	fnodes.append("circle")
	     .attr("class", "hld-circle")
	     .attr("r", radius)

	tree_group.select("#hld-node-" + 0).append("text").attr("class", "hld-root-id")
	    .attr("text-anchor", "middle").text("Root");

	// this function is called on tick events inside the force graph and it's how we simulate node movement
	force.on("tick", function() {
	    fnodes
		// .attr("cx", function(d) { return d.x; })
		// .attr("cy", function(d) { return d.y; })
	    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")";})
	    
	    flinks
		.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; })
	});
    }
    ss_callbacks[1] = function(tree, current_node) {
	svg.select("#hld-node-" + current_node).append("text").attr("class", "hld-size-label")
	    .attr("dx", -radius).attr("dy", -radius).attr("text-anchor", "middle").text(tree[current_node].subTreeSize);
    };
    ss_callbacks[4] = function(tree, current_node, idx, sub_result) {
	var id = tree[current_node].children[idx];
	svg.select("#hld-link-from-" + current_node + "-to-" + id).classed("hld-link-highlighted", true);
	svg.select("#hld-node-" + current_node + " .hld-size-label").text(tree[current_node].subTreeSize + " + " + sub_result);
	return this.AlgorithmContext.getBaselineAnimationSpeed();
    };
    ss_callbacks[5] = function(tree, current_node, idx) {
	svg.select("#hld-node-" + current_node + " .hld-size-label").text(tree[current_node].subTreeSize);	
    };


    /******************/
    /** Wiring code ***/
    /******************/
    var hld_context = _my.AlgorithmUtils.createAlgorithmContext(layout.defaultControlsObj);
    var hld_algo = new _my.Algorithm(heavyLightDecomposition, hld_callbacks, "hld-code", hld_context);
    var ss_context = _my.AlgorithmUtils.createAlgorithmContext(layout.defaultControlsObj);
    var ss_algo = new _my.Algorithm(computeSubtreeSize, ss_callbacks, "ss-code", ss_context);

    _my.AlgorithmUtils.appendCode(algorithmTabId, "ss-code", ss_algo);
    _my.AlgorithmUtils.appendCode(algorithmTabId, "hld-code", hld_algo);

    // the randomness here isn't good i think .. certain shapes are very improbable whereas
    // all shapes should have the same probablitity (maybe it's okay .. the prob of a every labelled shape is 
    // the same isn't it? at every stage the prob of picking the number we picked is the same 
    function createRandomTree(N) {
	var nodes = {};
	for (var i = 0; i < N; i++) {
	    nodes[i] = {idx: i, children: []};
	    if (i > 0) {
		var parent = Math.floor(Math.random() * (i - 1));
		nodes[parent].children.push(i);
	    }
	}
	nodes.size = N - 1;
	nodes.isLeafNode = function(val) { return this[val].children.length == 0; };
	return nodes;
    }

    var tree = createRandomTree(TREE_SIZE);
    initialize(tree);
    // tree[0] = {idx: 0, children: [1, 3, 5]};
    // tree[1] = {idx: 1, children: [2, 4]};
    // tree[2] = {idx: 2, children: []};
    // tree[3] = {idx: 3, children: []};
    // tree[4] = {idx: 4, children: [6]};
    // tree[5] = {idx: 5, children: [7]};
    // tree[6] = {idx: 6, children: [8]};
    // tree[7] = {idx: 7, children: []};
    // tree[8] = {idx: 8, children: []};
    // tree.size = 8;
    // tree.isLeafNode = function(val) { return this[val].children.length == 0; };

    _my.AlgorithmUtils.attachAlgoToControls(ss_algo, algorithmTabId, function(play_callback){
	ss_algo.run(tree, 0);
	chains = {chainLengths: undefined, 
		  chainHeads: undefined, 
		  chainPos:undefined, 
		  chainIdx:undefined, 
		  numChains:undefined};
	chains.numChains = 0;
	chains.chainLengths = new Array(tree.size);
	chains.chainLengths.fill(0);
	chains.chainHeads = new Array(tree.size);
	chains.chainHeads.fill(undefined);
	chains.chainPos = new Array(tree.size);
	chains.chainIdx = new Array(tree.size);
	chains.chainIdx.fill(undefined);
	hld_algo.runWithSharedAnimationQueue(ss_algo, tree, 0, 0, chains);
	console.log(tree, chains);
	play_callback();
    });

    //return {"hld": heavyLightDecomposition, "hld-algo": hld_algo};

}(ALGORITHM_MODULE, d3, bootbox));
