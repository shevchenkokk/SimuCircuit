import wireImage from './assets/images/wire.svg';
import resistorImage from './assets/images/resistor.svg';
import voltageSourceImage from './assets/images/voltage-source.svg';
import currentSourceImage from './assets/images/current-source.svg';
import capacitorImage from './assets/images/capacitor.svg';
import inductorImage from './assets/images/inductor.svg';
import ammeterImage from './assets/images/ammeter.svg';
import voltmeterImage from './assets/images/voltmeter.svg';

export const componentsList = {
    wire: {
        image: wireImage,
        width: 64, // Примерная ширина изображения
        height: 64  // Примерная высота изображения
    },
    resistor: {
        image: resistorImage,
        width: 100,
        height: 100
    },
    voltageSource: {
        image: voltageSourceImage,
        width: 100,
        height: 100
    },
    currentSource: {
        image: currentSourceImage,
        width: 100,
        height: 100
    },
    capacitor: {
        image: capacitorImage,
        width: 100,
        height: 90
    },
    inductor: {
        image: inductorImage,
        width: 100,
        height: 95
    },
    ammeter: {
        image: ammeterImage,
        width: 100,
        height: 100
    },
    voltmeter: {
        image: voltmeterImage,
        width: 100,
        height: 100
    }
};