/* This file is released under the GNU General Public License, version 3
 * */

'use strict';
var dataP;


function SdosSheetController() {
    var jsonFile = "partree.json";

    var icon_file = "/angular/icons/d3/plusfile.svg";
    var icon_key = "/angular/icons/d3/key.svg";
    var icon_masterkey = "/angular/icons/d3/masterkey.svg";
    var icon_plusfile = "/angular/icons/d3/pluskey_object.svg";
    var icon_pluskey = "/angular/icons/d3/pluskey.svg";
    var icon_object = "/angular/icons/d3/key_object.svg";
    var icon_selectedfile = "/angular/icons/d3/selected_file.svg";
    var icon_key_delete = "/angular/icons/d3/key_object_delete.svg";
    var icon_file_delete = "/angular/icons/d3/plusfile_delete.svg";

    var dataset;

    var inicialTree = [];
    var text;

    var animation = 0;

    var selected_object = null;


    var margin = {top: 20, right: 120, bottom: 20, left: 120},
        width = 1000 - margin.right - margin.left,
        height = 800 - margin.top - margin.bottom;

    var i = 0,
        duration = 750,
        root;

    var tree = d3.layout.tree()
        .size([height, width]);

    var diagonal = d3.svg.diagonal()
        .projection(function (d) {
            return [d.y, d.x];
        });

    var zoom = d3.behavior.zoom().scaleExtent([0, 1]).translate([120, 20]).on("zoom", zoomed);

    var svg;


    /*
     *
     * Rendering functions
     *
     * */
    d3.json(jsonFile, function (error, data) {
        if (error) {
            console.log(error);
        } else {
            console.log(data);

            dataP = data;
            renderTree(data);

        }
    });

    function renderTree(data) {
        console.log("rendering: " + data);
        dataset = jsonToPartitions(data); //jsonToFlare(data);
        root = dataset[0];
        root.x0 = height / 2;
        root.y0 = 0;


        dataP = root;
        d3.select(self.frameElement).style("height", "500px");

        svg = d3.select("#cascadeRendering").append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

        var open = [];
        /* For the start configuration of the tree
         * takes the first node of each level and let
         * their open
         * */
        for (var i = 0; i < data.levels - 1; i++) {
            open.push(pidFop(data.partitionSize, i));
        }
        inicialTree = open;
        closeTree(root, open);
        update(root);

        console.log("shgdjsd", dataset.sdos_batch_delete_log);
        console.log("shgdjsd", dataset.sdos_batch_delete_log);
        if(dataset.sdos_batch_delete_log != null){
            console.log("SDNLSDNSD");
            loadNode(root, dataset.sdos_batch_delete_log, dataset);
        }

        d3.select("#cascadeRendering").append("input")
            .attr("type", "checkbox")
            .attr("id", "autoAnimation")
            .attr("checked", "checked");

        d3.select("#cascadeRendering").append("span")
            .text("Automatic animation ");

        d3.select("#cascadeRendering").append("input")
            .attr("type", "button")
            .attr("value",  "next")
            .on("click", function (){
                stepAnimation(selected_object);
            });

         d3.select("#cascadeRendering").append("input")
            .attr("type", "button")
            .attr("value",  "delete")
            .on("click", function (){
                deleteAnimation(selected_object);
            });

        var delete_text = d3.select("#cascadeRendering").append("input")
            .attr("type", "text")
            .attr("disabled",  "disabled")
            .attr("id", "delete_text")
            .attr("size", 100);

        d3.select("#cascadeRendering").append("br");


        /*
         * Bellow are the buttons to "Reset tree" and "Search Node"
         * used only in the development file
         * */

        /* "Reset Tree" button using the open list configuration
         * */
        d3.select("#cascadeRendering").append("input")
            .attr("type", "button")
            .attr("value", "Reset Tree")
            .on("click", function () {
                closeTree(root, open);
                update(root);
            });

        /* "Search Node" button and selection list
         * Create the select list for the objects names
         * */
        text = d3.select("#cascadeRendering").append("select")
            .attr('id', "valueText");

        /* add to the objects from the objectsMapping
         * a link to their father in order to find the path
         * for then later when the user selects an object
         * */
        var optionList = [];
        for (i in data.objectMapping) {
            for (var j = 0; j < data.objectMapping[i].length; j++) {
                if (data.objectMapping[i][j] != null)
                    data.objectMapping[i][j]['parent'] = i;
            }
            optionList = optionList.concat(data.objectMapping[i]);
        }
        /* The value of an <option> is the parent number
         * */
        text.selectAll('option')
            .data(optionList).enter()
            .append('option').text(function (d) {
            return d.objName
        })
            .attr('value', function (d) {
                return d.parent + "|" + d.objName
            });

        /* By clicking the search button it calls the leafPath function
         *  with the value of the option selected
         * */
        d3.select("#cascadeRendering").append("input")
            .attr("type", "button")
            .attr("value", "Search Node")
            .on("click", function () {
                searchNode(root, text, data);
            });

        /*
        *  Button and camp text delete
        * */



    }
    /*
    * Ends rendering functions
    * */


    /* Zoom functions area
     *
     * Note: the var zoom is created to be called by the svg --> line 33
     * */
    function zoomed() {
        svg.attr("transform",
            "translate(" + zoom.translate() + ")" +
            "scale(" + zoom.scale() + ")"
        );
    }

    function interpolateZoom(translate, scale) {
        var self = this;
        return d3.transition().duration(duration).tween("zoom", function () {
            var iTranslate = d3.interpolate(zoom.translate(), translate),
                iScale = d3.interpolate(zoom.scale(), scale);
            return function (t) {
                zoom
                    .scale(iScale(t))
                    .translate(iTranslate(t));
                zoomed();
            };
        });
    }

    function zoomClick(id) {
        var factor = 0.5,
            center = [width / 2, height / 2],
            extent = zoom.scaleExtent(),
            translate = zoom.translate(),
            view = {x: translate[0], y: translate[1], k: zoom.scale()};

        d3.event.preventDefault();
        var direction = (id === 'zoom_in') ? 2 : -1;
        var target_zoom = zoom.scale() * (1 + factor * direction);


        var translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
        view.k = target_zoom;
        var l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

        view.x += center[0] - l[0];
        view.y += center[1] - l[1];

        interpolateZoom([120, 20], view.k);
    }

    function buttonClick() {
        console.log(this.id);
        if (this.id == 'zoom_in' || this.id == 'zoom_out') {

            return zoomClick(this.id);
        }
        else {
            animateClick(this.id);
        }
    }

    d3.selectAll('button').on('click', buttonClick);

    /* Ends zoom functions */


    /*
    *
    * Selecting path and objects functions
    *
    * */
    function loadNode(source, text, data) {
        console.log(text);
        var path = [];
        var aux = text.split("|");
        leafPath(parseInt(aux[0]), data.partitionSize, path);
        rightChildren(source, path, aux[1]);
        closeTree(source, path);
        update(root);
    }

    /* text is a string in the format "parent|object_name"
     *  source is the root tree
     *  data is the raw data from the json file
     * */
    function searchNode(source, text, data) {
        var path = [];
        var aux = text.property("value").toString().split("|");

        leafPath(parseInt(aux[0]), data.partitionSize, path);
        rightChildren(source, path, aux[1]);
        closeTree(source, path);
        update(root);
    }

    function leafPath(value, ps, path) {

        var number = value;
        /* By the number/key node name, finds all the path
         *  from the root to this current number
         *  returning it in a list
         * */
        if (number > 0) {
            var parent = parseInt((number - 1) / ps);
            path.push(number);
            leafPath(parent, ps, path);
        } else {
            path.push(0);
        }
    }

    function rightChildren(source, openNodes, object) {
        /* Go through all children
         * */
        var inChildren = 0;
        var next = null;
        var down = 1;

        /* Testes if the node is not closed, then open it
         * */
        if (source._children != null) {
            //console.log(source);
            changeChildren(source);

        }

        if (source.children != null) {
            while (!inChildren) {

                source.children.forEach(function (d) {

                    /* See if this node is in the OpenNodes list
                     *  if it is and it is a "key" type, goes to the next node
                     *  if it is a "key_object" type
                     *  */
                    d.operation = "none";
                    if (openNodes.indexOf(d.name) > -1 && (d.type == "key")) {
                        d.operation = "selected";
                        inChildren = 1;
                        next = d;
                    }
                    else if (d.type == "key_object" && d.children[0] && d.children[0].name == object) {
                        d.operation = "selected";
                        inChildren = 1;
                    }


                });

                if (!inChildren) {
                    if (down) {
                        siblingsDown(source.children[source.children.length - 1]);
                        if (source.siblings_down.length == 0) {
                            down = 0;
                        }
                    }
                    else {
                        siblingsUp(source.children[0]);
                        if (source.siblings_up.length == 0) {
                            down = 1;
                        }
                    }
                }
            }
        }

        if (next != null) {
            rightChildren(next, openNodes, object);
        }

    }

    function closeTree(source, openNodes) {
        /* Uses the click function to let just the nodes
         *  in the array openNodes open in the tree. the remain
         *  do not show its children
         * */
        var nodes = tree.nodes(source).reverse();

        nodes.forEach(function (d) {
            /* The actual node d is the node tested to be in the path
             *  So to open & show the path, the node d have to be in its parent children
             * */
            if (d.type != "key_object") {
                if (d.children != null && openNodes.indexOf(d.name) < 0) {
                    changeChildren(d);
                    //console.log(d);
                }
                else if (d._children != null && openNodes.indexOf(d.name) > -1) {
                    changeChildren(d);
                }
            }
        });
    }
    /*
    * ends Selecting path and objects functions
    * */


    /*
    *
    * Animation functions
    *
    * */

    function newAnimation(d, visited_keys, callback) {
        setTimeout(function () {
            d3.select("#delete_text").attr("value", "Inputing new key");
            d.operation = "new";
            update(d);
            if(callback) {
                // remove next node from visited nodes
                var next = visited_keys.shift();
                callback(next, visited_keys, newAnimation);
            }
        }, 750);

    }

    function fadingAnimation(d, visited_keys, callback) {
        console.log(visited_keys);
        setTimeout(function () {
            console.log("sdsdsdsd",d);
            d3.select("#delete_text").attr("value", "Deleting old key");
            d.operation = "fade";
            update(d);
            if(d.type == "object"){
                var parent = d.parent;
                parent.children = null;
                update(parent);
            }
            // remove next node from visited nodes
            if (visited_keys.length > 0) {
                if (visited_keys[0].type != "object") {
                    callback(d, visited_keys, fadingAnimation);
                }
                else {
                    var next = visited_keys.shift();
                    fadingAnimation(next, visited_keys);
                    // should not have the case of trying call the callback from this point, since order
                }
            }else if(visited_keys.length == 0 && callback){
                if(d.type != "key_object" && d.type != "object") {
                    callback(d, visited_keys);
                }
            }
        }, 750);

    }

    function changingKeysAnimation(d, visited_keys) {
        console.log("changing",d);
        console.log(visited_keys.reverse());
        var list = visited_keys;
        fadingAnimation(d, list, newAnimation);
    }

    function selectingAnimation(d, visited_keys, callback) {

        setTimeout(function () {
            if (d.parent) {
                d3.select("#delete_text").attr("value", "Selecting path from leaf to root");
                d.operation = "selecting";
                update(d);
                visited_keys.push(d);
                selectingAnimation(d.parent, visited_keys, callback);
            }
            else {
                if(callback)
                    callback(d, visited_keys);
                else{
                    // case when the step animation called, need put key master in the array
                    var last = visited_keys.pop();
                    visited_keys.push(last);
                    visited_keys.push(last.parent);
                }
            }
        }, 750);

    }

    var step = 0;
    var keys = [];

    function stepAnimation(d){

        if(step == 0){
            // selecting step
            selectingAnimation(d,keys);
            step = 1;

        }
        else{
            if(keys != []){
                var node = keys.pop();
                console.log("steo",d);
                changingKeysAnimation(node, []);
            }
        }
    }

    function deleteAnimation(d) {
        var auto = d3.select("#autoAnimation").property("checked");
        if(!animation) {
            if(auto) {
                animation = 1;
                selectingAnimation(d, [], changingKeysAnimation);
            }
            else{
                // step by step
                console.log("step");
                stepAnimation(d);

            }
        }
    }

    /*
    * End animations functions
    *
    * */


    /*
    * Drawing function
    * */
    function update(source) {

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();  // list of the nodes objects, descending
console.log(nodes);




        var links = tree.links(nodes);
//console.log(links);
        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            d.y = d.depth * 75;
        }); // the distance between nodes


        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function () {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on("click", function (d) {
                if (d.type == "down" || d.type == "object_down")
                    return clickDown(d);
                else if (d.type == "up" || d.type == "object_up")
                    return clickUp(d);
                else if (d.type == "object") {
                    selected_object = d;
                    d3.select("#valueText")
                        .property("value",
                            d.parent.parent.name.toString()+"|"+d.name
                        )
                        .attr("selected", true);

                    return loadNode(root, d.parent.parent.name.toString() + "|" + d.name.toString(), dataP);
                }
                else return click(d)
            });

        // append circles and rectangles to the nodes

        function rectHeight(d) {

            var inicial = d.x;
            var final;
            var next = false;
            d.parent.children.forEach(function (e) {

                if (e.name == d.name + 1) {
                    final = e.x;
                    next = true;
                }
            });

            if (!next) {
                if (d.parent.children[d.parent.children.length - 1].type == "down")
                    final = d.parent.children[d.parent.children.length - 1].x;
                else final = inicial + 60;
            }

            return final - inicial;
        }


        /*nodeEnter.append("rect")
            .attr("width", function (d) {
                return (d.type == "key" || d.type == "key_object") ? 40 : null
            })
            .attr("height", function (d) {
                return (d.type == "key" || d.type == "key_object") ? rectHeight(d) : null;
            })
            .attr("class", function (d) {
                return (d.type == "key" ) ? "key" : "object";
            })
            .attr("x", "-10px")
            .attr("y", "-24px")
            .style("fill-opacity", 1e-6);
*/

        nodeEnter.append("svg:image")
            .attr("xlink:href", function (d) {
                return d.type == "key" ? icon_key : ( d.type == "master" ? icon_masterkey : ( d.type == "object" ? icon_file :
                    (d.type == "key_object" ? icon_object : (d.type == "up" || d.type == "down" ? icon_pluskey : icon_plusfile) )));
            })
            .attr("x", "-9px")
            .attr("y", "-24px")
            .attr("width", "37px")
            .attr("height", "37px");




        // the label of the node
        nodeEnter.append("text")
            .attr("x", 23)
            .attr("dy", "1.5em")
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function (d) {
                return d.name;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // the new style after the transition
        nodeUpdate.select("image")
            .attr("xlink:href", function (d) {
                if((d.type == "object" || d.type == "key_object") && d.operation == "selecting"){
                    return d.type == "object" ? icon_file_delete : icon_key_delete;
                }
                if(d.type == "object" && d.parent.operation == "selected")
                    return icon_selectedfile;
                return d.operation == "new" ? icon_pluskey : (d.operation == "fade" ? "" : ( d.type == "key" ? icon_key : ( d.type == "master" ? icon_masterkey : ( d.type == "object" ? icon_file :
                    (d.type == "key_object" ? icon_object : (d.type == "up" || d.type == "down" ? icon_pluskey : icon_plusfile) )))));
            });


        /*nodeUpdate.select("rect")
            .attr("width", function (d) {
                return (d.type == "key" || d.type == "key_object") ? 40 : null
            })
            .attr("height", function (d) {
                return (d.type == "key" || d.type == "key_object") ? rectHeight(d) : null;
            })
            .attr("class", function (d) {
                return (d.type == "key") ? "key" : "object";
            })
            .attr("x", "-10px")
            .attr("y", "-24px")
            .style("fill", function (d) {
                return d._children ? (d.type == "key" ? "lightsteelblue" : "#c3c3c3" ) : "#fff"
            })
            .style("fill-opacity", 1)
            //TODO IDEA 1
            .style("stroke", function (d) {
                return d.operation == "selected" ? "#DA6B03" : ( d.operation == "selecting"? "#B83737" :"steelblue")
            })
        ;*/


        nodeUpdate.select("text")
            .style("fill", function (d) {
                if(d.type == "object" && d.parent.operation == "selected")
                    return "#DA6B03";
            })
            .style("fill-opacity", function (d) {
                return d.operation == "fade" && (d.type == "key_object" || d.type == "object" ) ? 0 : 1;
            });

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function () {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();


        nodeExit.select("text")
            .style("fill-opacity", 1e-6);


        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function (d) {
                return d.target.id;
            });
        console.log(link);
        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function () {
                var o = {x: source.x0, y: source.y0};
                console.log(o);
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function () {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    /*
    *
    * Function for navigation and click events
    *
    * */
    function clickDown(d) {
        siblingsDown(d);
        update(d);
    }

    function siblingsDown(d) {
        // add the list up object
        if (d.parent.siblings_up.length == 0) {
            if (d.type == "object_down")
                d.parent.children.splice(0, 0, {"name": "↑", "children": null, "type": "object_up"});
            else
                d.parent.children.splice(0, 0, {"name": "↑", "children": null, "type": "up"});
        }
        /* Remove the last 5 children from the parent
         * */
        var newSiblings;

        if (d.parent.siblings_up.lenght == 0)
            newSiblings = d.parent.children.splice(0, d.parent.children.length - 1);
        else
            newSiblings = d.parent.children.splice(-6, 5);
        // Take new children from the siblings_down
        var newChildren = d.parent.siblings_down.splice(0, 5);
        newChildren.forEach(function (e) {
            d.parent.children.splice(-1, 0, e);
        });

        // put the old children in siblings_up
        d.parent.siblings_up = d.parent.siblings_up.concat(newSiblings);

        // if comes to the end of the list siblings_down, remove the list down objetc
        if (d.parent.siblings_down.length == 0)
            d.parent.children.splice(-1, 1);

        //update(d);
    }

    function clickUp(d) {
        siblingsUp(d);
        update(d);
    }

    function siblingsUp(d) {

        // take the new children
        var newChildren = d.parent.siblings_up.splice(d.parent.siblings_up.length - 5, 5);

        var newSiblings;
        // remove children
        if (d.parent.siblings_down.length == 0) {
            newSiblings = d.parent.children.splice(1, d.parent.children.length - 1);

            if (d.type == "object_up")
                d.parent.children.splice(1, 0, {"name": "↓", "children": null, "type": "object_down"});
            else
                d.parent.children.splice(1, 0, {"name": "↓", "children": null, "type": "down"});
        }
        else {
            newSiblings = d.parent.children.splice(-6, 5);
        }

        newChildren.forEach(function (e) {
            d.parent.children.splice(-1, 0, e);
        });


        d.parent.siblings_down = newSiblings.concat(d.parent.siblings_down);

        if (d.parent.siblings_up.length == 0)
            d.parent.children.splice(0, 1);

        //update(d);
    }

// Toggle children on click.
    function changeChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }

    function click(d) {
        changeChildren(d);
        update(d);
    }
    /*
    * Ends navigation and click events functions
    * */


    var namePartitions = 0;
    function jsonToPartitions(data){
        var partition = getPartitions(0,namePartitions, name, data);
        console.log(partition);
        var p = {
            "name": 0,
            "children": [partition],
            "type": "master",
            "nodeName": 0,
            "siblings_up": null,
            "siblings_down": null,
        };
        console.log(p);
        return [p];
    }

    /*
    * To build the tree following the partitions, the attributes
     * parent and node have to be related by the partition,
     * but calculations over the tree is made in relation to the
     * keys/nodes numbering, so it is needed have both information
    * */
    function getPartitions(nodeParent, partitionParent, level, data){
        var i;
        var type = "key_object";
        var nodes = [];
        var partitionChildren = [];
        var partitionName = namePartitions + 1;
        namePartitions = partitionName;

        // all key-partitions levels
        if(level < data.levels){
            type = "key";
            /*
            * Based on the nodeParent, it calculates the nodes that
             * belong to this actual partition
            * */
            var first = (nodeParent * data.partitionSize) + 1;
            var last = (nodeParent + 1) * data.partitionSize;

            /*
            * It checks from this range of child nodes which were used
            * in the partition tree
            * */
            var k = 0;
            var l = 0;
            for(i = first; i <= last; i++){
                if (data.usedPartitions.indexOf(i) > -1) {

                    partitionChildren[l] = getPartitions(i,partitionName,level+1, data);
                    nodes[k] = {
                        "name": i,
                        "type": "key",
                        "level": level,
                        "partitionChild": partitionChildren[l],
                    };
                    l++;
                    k++;
                }
            }

        }
        // object partition level
        //else{}

        return {
            "name": partitionName,
            "children": partitionChildren,
            "type": type,
            "nodes": nodes,
        };

    }





    /* The next functions are responsible for the translation of the
     * json data to the Flare data, which is used by the drawing functions
     * of d3js to build a tree
     * */
    function jsonToFlare(data) {
        /* Start with the root of the tree that is always 0
         *  Then get all the other nodes recursively using getChildren
         * */
        var name = 0; //pidFop(data.partitionSize, 0);  it is always 0
        var children = getChildren(name, 1, data);
        return [{
            "name": name,
            "children": children[0],
            "siblings_up": null,
            "siblings_down": children[1],
            "type": "master"
        }];
    }

    /* This functions gets the actual node(parent) and calculates
     * who will be its children.
     * For just the key_partitions part of the tree, it uses two calculations
     * to get the first child and the last child of this node
     * and check if the children are in the usedPartitions list.
     * For the object_partitions, it just access the ObjectMapping object
     * and get the list of objects based on the node/parent name
     * and creates the right data from it.
     * */
    function getChildren(parent, level, data) {
        var children = [];
        var siblings = [];
        var k = 0;
        var i;
        if (level == data.levels) {
            /* Case that maps the objects keys to the leafs
             *  their behavior is different since their name is not related to te tree structure
             *  as are the non-objects-partitions nodes
             * */
            var objects = data.objectMapping[parent];

            /* Sort the objects by the slot number
             * */
            objects.sort(function (a, b) {
                return a.slot - b.slot
            });

            if (objects != null) {

                if (objects.length > 5) {

                    /* Creates the first plus node with no siblings
                     * show: false , because it will not appear yet
                     * */
                    //children[0] = {name: "...", "children": null, "type": "object_up", "show": false};
                    /* Iterates in all children
                     * */
                    for (i = 0; i < 5; i++) {
                        /* Just plus nodes have siblings
                         * */
                        children[i] = {
                            name: objects[i].slot,
                            "children": [{name: objects[i].objName, "type": "object"}],
                            "type": "key_object"
                        };
                    }

                    for (i = 5; i < objects.length; i++) {
                        /* Hide the children
                         * */
                        siblings[i - 5] = {
                            name: objects[i].slot,
                            "children": [{name: objects[i].objName, "type": "object"}],
                            "type": "key_object"
                        };
                    }
                    /* Add the siblings to the plus nodes
                     * */
                    //children[0]["siblings"] = siblings;
                    children[5] = {name: "↓", "children": null, "type": "object_down"};

                }
                else {
                    for (i = 0; i < objects.length; i++) {
                        children[i] = {
                            name: objects[i].slot,
                            "children": [{name: objects[i].objName, "type": "object"}],
                            "type": "key_object"
                        };
                    }
                }
            }
        }
        else {
            /* For the actual parent node it calculates the first and last children
             * and see if all its interval of children are in the used partition
             * and add the ones that are
             * */
            var first = (parent * data.partitionSize) + 1;
            var last = (parent + 1) * data.partitionSize;
            var childs;


            children[0] = {"name": "↓", "children": null, "type": "up"};
            k = 1;
            for (i = first; i <= last; i++) {
                // for each child of this parent
                // just create nodes for the children that are in the usedPartitions
                if (data.usedPartitions.indexOf(i) > -1) {

                    if (k < 6) {
                        childs = getChildren(i, level + 1, data);
                        children[k] = {
                            "name": i,
                            "children": childs[0],
                            "siblings_up": [],
                            "siblings_down": childs[1],
                            "type": "key",
                            "level": level
                        };
                    }
                    else {
                        childs = getChildren(i, level + 1, data);
                        siblings[k - 6] = {
                            "name": i,
                            "children": null,
                            "_children": childs[0],
                            "siblings_up": [],
                            "siblings_down": childs[1],
                            "type": "key",
                            "level": level
                        };
                    }

                    k++;
                }
                // if a node is not in used partitions, it is not showed because performance issues
            }

            if (children.length < 7 && siblings.length == 0) {
                children.splice(0, 1);
            }
            else {
                children.splice(0, 1);
                children[children.length] = {"name": "↓", "children": null, "type": "down"};
            }


        }
        return [children, siblings];

    }

    /* End data translations functions
     * */

    function pidFop(ps, level) {
        /* Calculates the first node of a level
         * */
        return (Math.pow(ps, level) - 1) / (ps - 1);
    }

};

SdosSheetController();