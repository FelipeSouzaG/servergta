import 'dotenv/config';
import axios from 'axios';
import RequestError from '../erros/RequestError.js';

class AddressValidation {
  static validateAddress = async (req, res, next) => {
    try {
      const { street, number, district, city, state, postalCode } = req.body;
      const addressCoordinates = await this.getAddressCoordinates(
        street,
        number,
        district,
        city,
        state,
        postalCode
      );
      if (!addressCoordinates) {
        return next(
          new RequestError({
            title: 'Endereço Inválido!',
            msg: 'Verifique o CEP e o Endereço informado',
          })
        );
      }
      req.body.coordinates = [addressCoordinates.lat, addressCoordinates.lng];
      next();
    } catch (error) {
      return next(
        new RequestError({
          title: 'Endereço Inválido!',
          msg: 'Falha na verificação das coordenadas do Endereço.',
        })
      );
    }
  };

  static async getAddressCoordinates(
    street,
    number,
    district,
    city,
    state,
    postalCode
  ) {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: `${street} ${number}, ${district}, ${city}, ${state}, ${postalCode}`,
            key: process.env.GEO_API_KEY,
          },
        }
      );
      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        return null;
      }
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } catch (error) {
      return null;
    }
  }
}

export default AddressValidation;
