@{%
    const common = require('./common')
%}

exp -> 
    exp _ "+" _ term {% ([l, $2, op, $4, r]) =>  new common.NodePlusNode(l, r) %}
    | exp _ "-" _ term {% ([l, $2, op, $4, r]) =>  new common.NodeMinusNode(l, r) %}
    | term {% id %}

term ->
    term _ "*" _ factor {% ([l, $2, op, $4, r]) => new common.NodeMulNode(l, r) %}
    | term _ "/" _ factor {% ([l, $2, op, $4, r]) => new common.NodeDivNode(l, r) %}
    | factor {% id %}

factor ->
    "(" _ exp _ ")" {% ([lp, $2, exp, $4, rp]) => exp %}
    | number {% ([n]) => new common.NodeNumber(parseInt(n.join(''))) %}

number -> [0-9]:+ {% id %}
_ -> [ \t]:* 