//Coordinate systems
function canvas_to_disk(p,poindisk){
  let x = (p.x - poindisk.cx)/poindisk.r;
  let y = -(p.y - poindisk.cy)/poindisk.r;

  if (x*x+y*y < 1.0){
    return {'x': x, 'y': y}
  }else{
    console.log("Something went wrong, probably rounding error")
    return null;
  }
}

function disk_to_canvas(p,poindisk){
  let x = p.x*poindisk.r + poindisk.cx;
  let y = -p.y*poindisk.r + poindisk.cy;
  return {'x': x, 'y': y};
}

function polar_to_cart(r,theta,center={'x':0,'y':0}){
  return{'x': center.x + (r*Math.cos(theta)), 'y': center.y + (r*Math.sin(theta))};
}

function cart_to_polar(p){
  let r = Math.sqrt(p.x*p.x+p.y*p.y);
  let theta = Math.atan2(p.y,p.x);
  return {'r': r, "theta": theta};
}

//Distances
function euclid_dist(p,q){
  return Math.sqrt(Math.pow(p.x-q.x,2) + Math.pow(p.y-q.y,2));
}

function hyper_dist(p,q){
  let pow = Math.pow;
  let numerator = 2*(pow(p.x-q.x,2)+pow(p.y-q.y,2));
  let denominator = ((1- pow(p.x,2) + pow(p.y,2)) * (1- pow(q.x,2) + pow(q.y,2)));

  return Math.acosh(1 + (numerator/denominator));
}

function r_poincare_to_euclid(r){
  return Math.tanh(r/2);
}

function hyper_radius_from_euclidean(r){
  return 2*Math.atanh(r)
}

//Euclidean lines
function euclid_line(p,q){
  //Todo: make this more robust to error
  let line =  {'a': p.y-q.y,
          'b': q.x - p.x,
          'c': p.x*q.y - q.x*p.y};
  if (Math.abs(line.b) > 0.001){
    return {'a': line.a/line.b, 'b': line.b/line.b, 'c': line.c/line.b}
  }else{
    return line
  }
}

function get_perpendicular_line(pq,v){
  //Returns a line perpendicular to pq that contains v
  return {'a': pq.b, 'b': -pq.a, 'c': -v.x * pq.b + v.y*pq.a};
}

function find_midpoint(p,q){
  //Returns the midpoint between p and q
  return {'x': (p.x + q.x) / 2, 'y': (p.y + q.y) / 2};
}

function find_intersection(pq,xy){
  //Todo: Handle parallel lines
  //Returns the point of intersection between lines pq and xy
  return {
    'x': (pq.c * xy.b - pq.b * xy.c) / (pq.b * xy.a - pq.a * xy.b),
    'y': (pq.a * xy.c - pq.c * xy.a) / (pq.b * xy.a - pq.a * xy.b)
  };
}

//Circle inversion
function circle_inversion(p,circle){
  //Inverts p about circle, returning the new point p' See link for details:
  //https://en.wikipedia.org/wiki/Inversive_geometry#Inversion_in_a_circle
  let dist = euclid_dist(p,circle.center);
  let new_c = circle.r*circle.r/(dist*dist);
  let u = {'x': (p.x - circle.center.x), 'y': (p.y - circle.center.y)};
  return {'x': new_c * u.x + circle.center.x, 'y': new_c * u.y + circle.center.y};
}

//Hyperbolic geodesic between two points in Poincare disk
function poincare_geodesic(p,q,poindisk){
  //Steps of the algorithm are as follows:
  //Find inverted points outside the unit disk
  //Grab midpoints between them.
  //Construct perpendicular lines at midpoint
  //Get intersection of perpendicular lines, C
  //C, along with p and q, fully characterize the arc.

  let pp = circle_inversion(p,poindisk);
  let qq = circle_inversion(q,poindisk);
  let M = find_midpoint(p,pp);
  let N = find_midpoint(q,qq);
  let m = get_perpendicular_line(euclid_line(p,pp),M);
  let n = get_perpendicular_line(euclid_line(q,qq),N);
  let C = find_intersection(m,n);

  return {'p1': p, 'p2': q, 'c': C,
          'startAngle': Math.atan2((q.y - C.y), q.x - C.x),
          'endAngle': Math.atan2((p.y - C.y), p.x - C.x),
          'r': euclid_dist(p,C)};
}

function arc_path(arc){
  //Takes an arc object (generated by poincare_geodesic) and
  //return a canvas/svg path for it.
  let minAngle = Math.min(arc.startAngle, arc.endAngle);
  let maxAngle = Math.max(arc.startAngle,arc.endAngle);
  let start = polar_to_cart(arc.r,minAngle,arc.c);
  let end = polar_to_cart(arc.r,maxAngle,arc.c);
  let sweepFlag = "1";

  // Handle angle wrapping around 360
  if ((arc.c.x < poindisk.cx && arc.c.y < poindisk.cy) || (arc.c.x < poindisk.cx && arc.c.y >= poindisk.cy)) {
      sweepFlag = (minAngle < Math.PI) && (maxAngle > Math.PI) ? "0": "1";
  } else {
      sweepFlag = "1";
  }

  return ['M', start.x,start.y,
          'A', arc.r, arc.r, 0, "0", sweepFlag, end.x, end.y
        ].join(" ");

}

//Circle functions--------------------------------------------------------------

//Todo: Allow for a circle given two/three points
function poincare_circle(center,r){
  //Return a circle in the poincare disk with center center and hyperbolic radius r
  //Math is done in terms of the Poincare disk
  let e_center_radius = Math.sqrt(center.x*center.x + center.y*center.y);
  let cr = hyper_radius_from_euclidean(e_center_radius); //Hyperbolic distance from origin

  let dh1 = cr - r;
  let dh2 = cr + r;
  let de1 = r_poincare_to_euclid(dh1);
  let de2 = r_poincare_to_euclid(dh2);
  let er = (de2-de1)/2;
  let ecr = (de2+de1)/2;

  let c_theta = Math.atan2(center.y,center.x);
  let x = ecr * Math.cos(c_theta);
  let y = ecr * Math.sin(c_theta);
  let canvas_coord = disk_to_canvas({'x':x, 'y':y},poindisk)
  //Attributes that begin with p are in terms of the poincare disk.
  return {'cx':canvas_coord.x, 'cy': canvas_coord.y, 'r': er*(poindisk.r),'px': x, 'py': y,  'center': {'x': x, 'y':y}}
}
