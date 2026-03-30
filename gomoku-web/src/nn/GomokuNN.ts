import * as tf from '@tensorflow/tfjs';
import { BOARD_SIZE } from '../gameLogic';

// 模型配置
export interface GomokuNNConfig {
  modelUrl?: string;           // 预训练模型URL
  loadPretrained?: boolean;    // 是否加载预训练模型
  enableFallback?: boolean;    // 加载失败时是否回退到随机初始化
}

export class GomokuNN {
  private model: tf.LayersModel | null = null;
  private isInitializing = false;
  private config: GomokuNNConfig;

  constructor(config: GomokuNNConfig = {}) {
    this.config = {
      modelUrl: config.modelUrl || this.getDefaultModelUrl(),
      loadPretrained: config.loadPretrained ?? true,
      enableFallback: config.enableFallback ?? true,
    };
  }

  /**
   * 获取默认模型URL（可以从环境变量或配置文件中读取）
   */
  private getDefaultModelUrl(): string {
    // 优先使用环境变量中的模型URL
    if (import.meta.env.VITE_GOMOKU_MODEL_URL) {
      return import.meta.env.VITE_GOMOKU_MODEL_URL;
    }

    // 默认模型URL（相对于public目录）
    return '/models/gomoku_tfjs/model.json';
  }

  /**
   * 初始化模型 - 尝试加载预训练模型，失败则创建新模型
   */
  async initialize() {
    if (this.model || this.isInitializing) return;
    this.isInitializing = true;

    console.log('正在初始化Gomoku神经网络...');

    // 尝试加载预训练模型
    if (this.config.loadPretrained && this.config.modelUrl) {
      try {
        await this.loadPretrainedModel();
        this.isInitializing = false;
        return;
      } catch (error) {
        console.warn('预训练模型加载失败，将使用随机初始化:', error);

        // 如果禁用回退，则抛出错误
        if (!this.config.enableFallback) {
          this.isInitializing = false;
          throw new Error(`无法加载预训练模型: ${error}`);
        }
      }
    }

    // 创建新模型（随机初始化）
    await this.createNewModel();
    this.isInitializing = false;
    console.log("Gomoku神经网络已初始化（随机权重）。");
  }

  /**
   * 加载预训练模型
   */
  async loadPretrainedModel(): Promise<void> {
    if (!this.config.modelUrl) {
      throw new Error('未提供模型URL');
    }

    console.log(`正在加载预训练模型: ${this.config.modelUrl}`);

    try {
      this.model = await tf.loadLayersModel(this.config.modelUrl);
      console.log('预训练模型加载成功');

      // 验证模型架构
      this.validateModelArchitecture();

    } catch (error) {
      console.error('模型加载失败:', error);
      this.model = null;
      throw error;
    }
  }

  /**
   * 验证加载的模型架构是否与预期匹配
   */
  private validateModelArchitecture(): void {
    if (!this.model) return;

    const inputShape = this.model.inputs[0].shape;
    const outputs = this.model.outputs;

    if (!inputShape || inputShape.length !== 4) {
      console.warn(`模型输入形状异常: ${inputShape}`);
    } else {
      console.log(`模型输入形状: ${inputShape}`);
    }

    if (outputs.length !== 2) {
      console.warn(`模型输出数量异常: ${outputs.length} (预期2)`);
    }

    // 可以添加更详细的验证逻辑
  }

  /**
   * 创建新模型（随机初始化）
   */
  private async createNewModel(): Promise<void> {
    // Define the input: 15x15 board, 2 channels (current player pieces, opponent pieces)
    const input = tf.input({ shape: [BOARD_SIZE, BOARD_SIZE, 2] });

    // Initial Convolutional Block
    let x = tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      padding: 'same',
      useBias: false,
      kernelInitializer: 'heNormal'
    }).apply(input) as tf.SymbolicTensor;
    x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;
    x = tf.layers.reLU().apply(x) as tf.SymbolicTensor;

    // Residual Blocks (using 3 blocks for browser performance, AlphaGo uses 10-40)
    for (let i = 0; i < 3; i++) {
      x = this.buildResidualBlock(x, 64);
    }

    // Policy Head (predicts the probability of each move)
    let policy = tf.layers.conv2d({
      filters: 2,
      kernelSize: 1,
      padding: 'same',
      useBias: false,
      kernelInitializer: 'heNormal'
    }).apply(x) as tf.SymbolicTensor;
    policy = tf.layers.batchNormalization().apply(policy) as tf.SymbolicTensor;
    policy = tf.layers.reLU().apply(policy) as tf.SymbolicTensor;
    policy = tf.layers.flatten().apply(policy) as tf.SymbolicTensor;
    const policyOutput = tf.layers.dense({
      units: BOARD_SIZE * BOARD_SIZE,
      activation: 'softmax',
      name: 'policy_head'
    }).apply(policy) as tf.SymbolicTensor;

    // Value Head (predicts the win probability from -1 to 1)
    let value = tf.layers.conv2d({
      filters: 1,
      kernelSize: 1,
      padding: 'same',
      useBias: false,
      kernelInitializer: 'heNormal'
    }).apply(x) as tf.SymbolicTensor;
    value = tf.layers.batchNormalization().apply(value) as tf.SymbolicTensor;
    value = tf.layers.reLU().apply(value) as tf.SymbolicTensor;
    value = tf.layers.flatten().apply(value) as tf.SymbolicTensor;
    value = tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }).apply(value) as tf.SymbolicTensor;
    const valueOutput = tf.layers.dense({
      units: 1,
      activation: 'tanh',
      name: 'value_head'
    }).apply(value) as tf.SymbolicTensor;

    this.model = tf.model({ inputs: input, outputs: [policyOutput, valueOutput] });

    // Compile the model (useful if we want to train it in the browser later)
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: ['categoricalCrossentropy', 'meanSquaredError']
    });
  }

  private buildResidualBlock(inputTensor: tf.SymbolicTensor, filters: number): tf.SymbolicTensor {
    let x = tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same',
      useBias: false,
      kernelInitializer: 'heNormal'
    }).apply(inputTensor) as tf.SymbolicTensor;
    x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;
    x = tf.layers.reLU().apply(x) as tf.SymbolicTensor;

    x = tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same',
      useBias: false,
      kernelInitializer: 'heNormal'
    }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.batchNormalization().apply(x) as tf.SymbolicTensor;

    // Skip connection
    const added = tf.layers.add().apply([inputTensor, x]) as tf.SymbolicTensor;
    return tf.layers.reLU().apply(added) as tf.SymbolicTensor;
  }

  /**
   * Convert the 2D board array into a 3D tensor for the neural network.
   * Channel 0: 1 if current player's piece, 0 otherwise.
   * Channel 1: 1 if opponent's piece, 0 otherwise.
   */
  boardToTensor(board: number[][], currentPlayer: number): tf.Tensor4D {
    const oppPlayer = currentPlayer === 1 ? 2 : 1;
    const buffer = tf.buffer([1, BOARD_SIZE, BOARD_SIZE, 2]);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === currentPlayer) {
          buffer.set(1, 0, r, c, 0);
        } else if (board[r][c] === oppPlayer) {
          buffer.set(1, 0, r, c, 1);
        }
      }
    }
    return buffer.toTensor() as tf.Tensor4D;
  }

  /**
   * Predict the policy (move probabilities) and value (win probability).
   */
  async predict(board: number[][], currentPlayer: number): Promise<{ policy: number[], value: number }> {
    if (!this.model) {
      await this.initialize();
    }

    return tf.tidy(() => {
      const inputTensor = this.boardToTensor(board, currentPlayer);
      const [policyTensor, valueTensor] = this.model!.predict(inputTensor) as [tf.Tensor, tf.Tensor];
      
      const policyArray = Array.from(policyTensor.dataSync());
      const valueScalar = valueTensor.dataSync()[0];

      return { policy: policyArray, value: valueScalar };
    });
  }
}

// Singleton instance with default configuration
export const gomokuNN = new GomokuNN({
  // 默认尝试加载预训练模型，失败则使用随机初始化
  loadPretrained: true,
  enableFallback: true,
});

/**
 * 创建自定义配置的GomokuNN实例
 * @param config 模型配置
 * @returns GomokuNN实例
 */
export function createGomokuNN(config?: GomokuNNConfig): GomokuNN {
  return new GomokuNN(config);
}
