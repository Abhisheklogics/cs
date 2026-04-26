// ============================================================
//  nn-core.js  —  Neural Network Logic (pure math, no DOM)
// ============================================================

class Perceptron {
  constructor(numInputs, activationName = 'step') {
    this.numInputs = numInputs;
    this.activationName = activationName;
    this.weights = makeArray(numInputs, () => randFloat(-1, 1));
    this.bias    = randFloat(-0.5, 0.5);
    this.lastResult = null;
  }

  forward(inputs) {
    const actFn = Activations[this.activationName];
    const products = inputs.map((x, i) => ({
      x, w: this.weights[i],
      product: round(x * this.weights[i], 4)
    }));
    const weightedSum = products.reduce((s, p) => s + p.product, 0) + this.bias;
    const output = actFn.fn(weightedSum);
    this.lastResult = { products, weightedSum: round(weightedSum, 4), output: round(output, 4) };
    return this.lastResult;
  }

  train(inputs, target, learningRate) {
    const result = this.forward(inputs);
    const error  = target - result.output;
    const deltas = this.weights.map((w, i) => {
      const delta = learningRate * error * inputs[i];
      this.weights[i] = round(w + delta, 6);
      return round(delta, 6);
    });
    const biasDelta = learningRate * error;
    this.bias = round(this.bias + biasDelta, 6);
    return { error: round(error, 4), deltas, biasDelta: round(biasDelta, 6) };
  }

  randomize() {
    this.weights = makeArray(this.numInputs, () => randFloat(-1, 1));
    this.bias    = randFloat(-0.5, 0.5);
    this.lastResult = null;
  }
}

class MLP {
  constructor(layerSizes, activationName = 'sigmoid') {
    this.layerSizes     = layerSizes;
    this.numLayers      = layerSizes.length;
    this.activationName = activationName;
    this.weights = [];
    this.biases  = [];
    for (let l = 0; l < this.numLayers - 1; l++) {
      const rows = layerSizes[l + 1];
      const cols = layerSizes[l];
      const scale = Math.sqrt(2 / (cols + rows));
      this.weights.push(makeArray(rows, () => makeArray(cols, () => randFloat(-scale, scale))));
      this.biases.push(makeArray(rows, () => 0));
    }
    this.activations = null;
    this.zValues     = null;
    this.lossHistory = [];
  }

  forward(inputs) {
    const actFn = Activations[this.activationName];
    this.activations = [inputs.slice()];
    this.zValues     = [null];
    for (let l = 0; l < this.numLayers - 1; l++) {
      const prevA = this.activations[l];
      const layerZ = [], layerA = [];
      for (let j = 0; j < this.layerSizes[l+1]; j++) {
        let z = this.biases[l][j];
        for (let i = 0; i < this.layerSizes[l]; i++) z += this.weights[l][j][i] * prevA[i];
        layerZ.push(z);
        layerA.push(actFn.fn(z));
      }
      this.zValues.push(layerZ);
      this.activations.push(layerA);
    }
    return this.activations[this.numLayers - 1].slice();
  }

  backward(inputs, targets, learningRate) {
    const actFn  = Activations[this.activationName];
    const output = this.forward(inputs);
    const N   = output.length;
    const mse = output.reduce((s, o, i) => s + (o - targets[i])**2, 0) / N;
    const deltas = makeArray(this.numLayers, () => []);
    const lastL  = this.numLayers - 1;
    deltas[lastL] = output.map((o, i) => (o - targets[i]) * actFn.dFn(this.zValues[lastL][i]));
    for (let l = lastL - 1; l >= 1; l--) {
      deltas[l] = makeArray(this.layerSizes[l], j => {
        let s = 0;
        for (let k = 0; k < this.layerSizes[l+1]; k++) s += this.weights[l][k][j] * deltas[l+1][k];
        return s * actFn.dFn(this.zValues[l][j]);
      });
    }
    for (let l = 0; l < this.numLayers - 1; l++) {
      for (let j = 0; j < this.layerSizes[l+1]; j++) {
        for (let i = 0; i < this.layerSizes[l]; i++) {
          this.weights[l][j][i] -= learningRate * deltas[l+1][j] * this.activations[l][i];
        }
        this.biases[l][j] -= learningRate * deltas[l+1][j];
      }
    }
    this.lossHistory.push(mse);
    return { mse, deltas, output };
  }

  trainEpochs(dataset, learningRate, epochs = 100) {
    for (let e = 0; e < epochs; e++) {
      for (const { inputs, targets } of dataset) {
        this.backward(inputs, targets, learningRate);
      }
    }
  }

  randomize() {
    for (let l = 0; l < this.numLayers - 1; l++) {
      const rows = this.layerSizes[l+1];
      const cols = this.layerSizes[l];
      const scale = Math.sqrt(2/(cols+rows));
      this.weights[l] = makeArray(rows, () => makeArray(cols, () => randFloat(-scale, scale)));
      this.biases[l]  = makeArray(rows, () => 0);
    }
    this.activations = null;
    this.zValues     = null;
    this.lossHistory = [];
  }
}

const Datasets = {
  xor: [
    { inputs:[0,0], targets:[0] },
    { inputs:[0,1], targets:[1] },
    { inputs:[1,0], targets:[1] },
    { inputs:[1,1], targets:[0] }
  ],
  and: [
    { inputs:[0,0], targets:[0] },
    { inputs:[0,1], targets:[0] },
    { inputs:[1,0], targets:[0] },
    { inputs:[1,1], targets:[1] }
  ],
  or: [
    { inputs:[0,0], targets:[0] },
    { inputs:[0,1], targets:[1] },
    { inputs:[1,0], targets:[1] },
    { inputs:[1,1], targets:[1] }
  ]
};

window.Perceptron = Perceptron;
window.MLP        = MLP;
window.Datasets   = Datasets;