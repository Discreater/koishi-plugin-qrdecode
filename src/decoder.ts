import { binarize, Decoder, Detected, Detector, grayscale, Pattern, Point } from '@nuintun/qrcode';
import { createCanvas, loadImage } from '@napi-rs/canvas'

export interface DecodeResult {
    content: string,
    finder: [Pattern, Pattern, Pattern],
    alignment: Pattern | null,
    timing: [Point, Point, Point],
    corners: [Point, Point, Point, Point]
}
export async function qrdecode(img: string): Promise<DecodeResult[]> {
    const normal = await _qrdecode(img, false);
    const inverted = await _qrdecode(img, true);
    if(normal.length !== 0) {
        return normal
    } else {
        return inverted
    }
}


async function _qrdecode(img: string, invert: boolean): Promise<DecodeResult[]> {
    const image = await loadImage(img)
    const { width, height } = image;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d')!;

    context.drawImage(image, 0, 0);

    const luminances = grayscale(context.getImageData(0, 0, width, height));
    const binarized = binarize(luminances, width, height);
    if(invert) {
        binarized.flip()
    }
    const detector = new Detector();
    const detected = detector.detect(binarized);
    const decoder = new Decoder();

    let current = detected.next();

    const results: DecodeResult[] = [];
    while (!current.done) {
        let succeed = false;

        const detect = current.value as Detected;

        try {
            const { size, finder, alignment } = detect;
            const decoded = decoder.decode(detect.matrix);
            // Finder
            const { topLeft, topRight, bottomLeft } = finder;
            // Corners
            const topLeftCorner = detect.mapping(0, 0);
            const topRightCorner = detect.mapping(size, 0);
            const bottomRightCorner = detect.mapping(size, size);
            const bottomLeftCorner = detect.mapping(0, size);
            // Timing
            const topLeftTiming = detect.mapping(6.5, 6.5);
            const topRightTiming = detect.mapping(size - 6.5, 6.5);
            const bottomLeftTiming = detect.mapping(6.5, size - 6.5);

            const res: DecodeResult = {
                content: decoded.content,
                finder: [topLeft, topRight, bottomLeft],
                alignment: alignment ? alignment : null,
                timing: [topLeftTiming, topRightTiming, bottomLeftTiming],
                corners: [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner]
            };
            results.push(res)

            succeed = true;
        } catch (e) {
            // Decode failed, skipping...
        }

        // Notice: pass succeed to next() is very important,
        // This can significantly reduce the number of detections.
        current = detected.next(succeed);
    }
    return results
}