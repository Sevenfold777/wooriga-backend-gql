import axios from 'axios';

type LunarResponse = {
  data: {
    response: {
      header: { resultCode: string };
      body: {
        items: { item: { lunYear: string; lunMonth: string; lunDay: string } };
      };
    };
  };
};

export async function convertSolarToLunarDate(solarDate: Date): Promise<Date> {
  try {
    const solarYear = solarDate.getFullYear();
    const solarMonth = String(solarDate.getMonth() + 1).padStart(2, '0');
    const solarDay = String(solarDate.getDate()).padStart(2, '0');

    const LUNAR_DATE_API_REQUEST_URL = `${process.env.LUNAR_DATE_API_ENDPOINT}?solYear=${solarYear}&solMonth=${solarMonth}&solDay=${solarDay}&ServiceKey=${process.env.DATAGOKR_KEY}`;
    const REQUEST_TIMEOUT = 10000; // 단위: ms (현재 설정값: 10초)

    const {
      data: {
        response: {
          header: { resultCode },
          body: {
            items: {
              item: { lunYear, lunMonth, lunDay },
            },
          },
        },
      },
    }: LunarResponse = await axios.get(LUNAR_DATE_API_REQUEST_URL, {
      timeout: REQUEST_TIMEOUT,
    });

    if (resultCode !== '00') {
      throw new Error('Cannot get lunar date from the open api request.');
    }

    return new Date(
      new Date(`${lunYear}-${lunMonth}-${lunDay}`).toLocaleDateString('ko-KR'),
    );
  } catch (e) {
    console.error('[convert solar to lunar date]', e.message);
    return undefined;
  }
}
