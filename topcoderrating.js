// error function
function erf(x) {
    // approximation
    // http://en.wikipedia.org/wiki/Error_function#Approximation_with_elementary_functions
    var p = 0.3275911;
    var a1 = 0.254829592;
    var a2 = -0.284496736;
    var a3 = 1.421413741;
    var a4 = -1.453152027;
    var a5 = 1.061405429;

    var sign = x >= 0 ? +1 : -1;
    x = Math.abs(x);

    var t = 1 / (1 + p * x);
    return sign * (1 - ((((((((a5 * t + a4) * t) + a3) * t) + a2) * t) + a1) * t) * Math.exp(-x * x));
}

// cumulative distribution function of standard normal distribution
function cdfStdNormal(x) {
    return (1 + erf(x / Math.sqrt(2))) / 2;
}

// inverse of cdfStdNormal
function inverseCdfStdNormal(y) {
    if (y < 0 || y > 1) {
        throw new Error("cdf value is in [0, 1]");
    }

    var eps = 1e-60;
    if (y < eps) {
        return -Infinity;
    }
    else if (1 - y < eps) {
        return Infinity;
    }

    // solve by binary search
    // Note:
    //  cdf is increasing function
    //  cdf(-50) is almost equal to 0
    //  cdf(50) is almost equal to 1
    var low = -50, high = 50;
    for (var i = 0; i < 100; ++i) {
        var mid = (low + high) / 2;
        if (cdfStdNormal(mid) < y) {
            low = mid;
        }
        else {
            high = mid;
        }
    }
    return low;
}

function RatingSystem(coders) {
    var that = this;

    that.coders = coders;

    that.numCoders = coders.length;
    that.aveRating = _.reduce(that.coders, function (sum, coder) { return sum + coder.rating; }, 0) / that.numCoders;
    that.cf = Math.sqrt(
        _.reduce(that.coders,
                 function (sum, coder) {
                     return sum + coder.volatility * coder.volatility;
                 }, 0) / that.numCoders
        +
        _.reduce(that.coders,
                 function (sum, coder) {
                     return sum + (coder.rating - that.aveRating) * (coder.rating - that.aveRating);
                 }, 0) / (that.numCoders - 1)
    );

    that.calcWp = function (currentCoder, otherCoder) {
        var nume = otherCoder.rating - currentCoder.rating;
        var deno = Math.sqrt(2 * (otherCoder.volatility * otherCoder.volatility + 
                                  currentCoder.volatility * currentCoder.volatility));
        return 0.5 * (erf(nume / deno) + 1);
    };

    that.expectedRankCache = {};
    that.calcExpectedRank = function (coder) {
        var key = coder.rating.toString() + coder.volatility.toString();
        if (!(key in that.expectedRankCache)) {
            var erank = 0.5 + _.reduce(that.coders, function (sum, otherCoder) { return sum + that.calcWp(coder, otherCoder); }, 0);
            that.expectedRankCache[key] = erank;
        }
        return that.expectedRankCache[key];
    }

    that.calc = function (coder, actualRank) {
        var that = this;

        var arank = actualRank;
        var erank = that.calcExpectedRank(coder);

        var eperf = -inverseCdfStdNormal((erank - 0.5) / that.numCoders);
        var aperf = -inverseCdfStdNormal((arank - 0.5) / that.numCoders);
        var perfAs = coder.rating + that.cf * (aperf - eperf);

        var weight = 1 / (1 - (0.42 / (coder.timesPlayed + 1) + 0.18)) - 1;
        if (coder.rating >= 2000) {
            if (coder.rating <= 2500) {
                weight *= 0.9;
            }
            else {
                weight *= 0.8;
            }
        }

        var newRating = Math.round((coder.rating + weight * perfAs) / (1 + weight));
        var cap = 150 + 1500 / (coder.timesPlayed + 2);
        var newRatingUpper = coder.rating + cap;
        var newRatingLower = coder.rating - cap;
        if (newRating > newRatingUpper) {
            newRating = newRatingUpper;
        }
        else if (newRating < newRatingLower) {
            newRating = newRatingLower;
        }

        var newVolatility = Math.round(Math.sqrt(
            (newRating - coder.rating) * (newRating - coder.rating) / weight + 
            coder.volatility * coder.volatility / (weight + 1)
        ));

        return {
            rating: newRating,
            volatility: newVolatility
        };
    };
}

