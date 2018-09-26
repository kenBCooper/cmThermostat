import * as Actions from '../constants/ActionTypes';
import { 
  parseDeviceShadow,
  updateRawDeviceShadow,
  publishDeviceShadowZoneUpdate,
  publishDeviceShadowVacationUpdate,
} from '../util/deviceShadowUtil';
import { getCurrentSystemNumber } from '../util/urlUtil';

const DEFAULT_STATE = {
  connected: false,
  rawShadow: {
     0: undefined,
  },
  user: {
    accessToken: undefined,
    idToken: undefined,
    refreshToken: undefined,
    mac: undefined,
  },
  shadow: {
    0: {
      zones: undefined,
      diagnostics: undefined,
      discover: undefined,
			vacations: undefined,
      systemConfig: undefined,
    },
  }
};

// FOR DEVELOPMENT
// const DEFAULT_STATE = JSON.parse('{"connected":true,"rawShadow":{"0":{"R":"0,0,","C":"0,145,40,0,4,2,0,3,0,20,0,3,0,0,9,21,5,6,35,1,17,","D":"0,77,32,32,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,","V":"0,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,","DIS":"0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,","P":"0,1,2,3,4,","S1":"0,0,74,75,70,95,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,1,0,1,0,0,0,0,0","S2":"0,0,74,75,70,95,60,1,2,5,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,1,0,1,0,0,0,0,0","S3":"0,0,70,75,70,95,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,0,0,0,0,0,1,0,0,0,0,0","S4":"0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,0,0,","S5":"0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,0,0,","S6":"0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,0,0,","S7":"0,0,75,83,81,62,60,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,5,0,1,6,0,0,3,3,1,0,0,0,","AS":"0,0,","T":"0,8,1,"}},"user":{"accessToken":"eyJraWQiOiJMaGMzZkhJRFNZNDhEV0JsRjFHVGxrS003RmlyQTRPR25jMFBOZmw4K1wvUT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI0ZWZhYzcxZC0xNWE0LTRmODQtYWEyZC1iMTQ0YjMyYTQyM2UiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLXdlc3QtMi5hbWF6b25hd3MuY29tXC91cy13ZXN0LTJfQmN2eGFsQkNpIiwiZXhwIjoxNTA2MDQ3NzE1LCJpYXQiOjE1MDYwNDQxMTYsImp0aSI6IjBkOGVhMjBlLWNmNmYtNDczYS1iM2NjLTM5YTI5ZGVmM2U5MSIsImNsaWVudF9pZCI6IjRlODluY3M2ZWFiNGU5czc1ZnFiMGVwOXVqIiwidXNlcm5hbWUiOiJrZXYuci5jb3g5MCt0ZXN0MUBnbWFpbC5jb20ifQ.OnJ7XGE6pw_KhgcmL1p21lMCfP5xThmfw9wK-uTSF4GIsDeVMaTtwmyX0bCEo6sCkfrgu-JFDEymPKOwnapfImkzz5zyhJZFOk0K0aplRcSAR-0ITBN2MX2lf9mpU2LtzWsk5OXKVSJ3NAZpofCQhvS04OdiU_tPiwH_sHGqJrY94FNUtvOWWiWIMwiHUuLF0JJk6Tae0gbviAlAEvzUJMT0zrNLMdAkVwvaOGu64eLzvodO28dC9mJENn12UVjWw1vFfKr3yjagy1sUdcmyRP_z6cqJrFWGew6763IV9uwxOsi_RhgNFDLZfeEceIaoaIQmqu3Khm-5UehgYvRnZQ","idToken":"eyJraWQiOiJWczVub1RRQ0IyRmtjUmxNcWRkN1BydUNibmVOV1JjNVI1MndaeWQ4MmdJPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI0ZWZhYzcxZC0xNWE0LTRmODQtYWEyZC1iMTQ0YjMyYTQyM2UiLCJhdWQiOiI0ZTg5bmNzNmVhYjRlOXM3NWZxYjBlcDl1aiIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE1MDYwNDQxMTUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy13ZXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtd2VzdC0yX0JjdnhhbEJDaSIsImNvZ25pdG86dXNlcm5hbWUiOiJrZXYuci5jb3g5MCt0ZXN0MUBnbWFpbC5jb20iLCJjdXN0b206bWFjIjoiZTRjNSIsImV4cCI6MTUwNjA0NzcxNSwiaWF0IjoxNTA2MDQ0MTE2LCJlbWFpbCI6Imtldi5yLmNveDkwK3Rlc3QxQGdtYWlsLmNvbSJ9.Fg9p3ih79hWLIL_tXJ9GEuxChTOgJkBb2Vu_cIVqe_K_dU9IeKiMXPcB-_1Ik7JkdfifL9aFGDu0TiSqJ7-lyYIKaM2FJNVF2yQIfZGL4TyO4Z9RGB2q00S_7Gsbmq0DLqT00x-MBJfnq3ddsZCBOUi3vbm7g_mUvQAjq_eo9ZAzXRwj6ogde7DrD3aLbB4MgJYlpsyFsBvmbJdQLLaIOtIJiEbLlQS9sPeV5Hm_9eHNhngjxO6YNbq0W4wWNae7VzDj4C4rbnfnh35X-r8q0qTgKKhkvR2mYxkrywiuQq2Si6gLEe2WsEokv2MrjA9lnSD5eg5Kl0ltfOpyYh-cGg","refreshToken":"eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.g0N3mszc0IUU6bDQaUbYQAywTGFcLKVEXSRBnw3UOjckVc3Bw_YkEs-v7r7JA1uZURa7zZveJKMdCsotqAbz8hP0CDrPTd4gb3AbOiL6y57Vg5hxmMs7jAoMKvHoqppD5HrIb6OeJqnMa9jCf7XxwNG-y9KuZheNs2pZF-Uu2BXhTG6oLio_zxU-L9ONvoqmxcpF_dCDsWwkTmSE9YcAgbriial0p4a8tbthVuO2t_Vkq5x_oBRahMBRIa0wIvqP4FvbeLf3MepP8fmwNPipBEKuVqG1fA1dq5Ihe6eEGwGnRWQeA-8VO5QCsa_ScFJRA6GxrJR1APi2-hK6PtPGOw.r9X_QzldtbuwQ-1O.jtajNdzP3AtE47IFJl52XnVhBlU7Z9D2B-MKloki4F5ZShGO4WAjD_XsAujneTvWoTbWKyp3cCxWwgGIOnD9AFl9EqQXvipI0BHeMf_N-sOud7cqdMdG1wJzu4s3mhvNqHKdGC7Q-X3TimI6TzoOKnT9olojl26Cp1oaLWzpgqjXgdlUruoK2wICNjuxb1XCiuzyM2rKw66cFjQ7OpiNUJEiK7cElW-VSYgkk96Hyzp9-bxcSO1zOsQDw4zP6Vc4425F90WZ2iK07kl-O1p6xqu_HQAdiNmbKsKZyhPu2pzB2vbCtGu0mCm3_B9zy6ENvEdoiERa0H--e0RWSMp_DYNSgyE47k6Pc7ChXfkxkUxMLMzj565VUb6xE_nngoPEMInmupRJmW-zpkp6crRKddXqBU9qizXVEogDRpg1VUAcW-mxdg-NRr6l4OY3Fcka3_Oh2PWtEDbAETPw3A2_1Lx3eZjeUqCeJJHphk1og7HfetxXCich6_ypp1RlUeDiHa8Ww1iUkTNHKIM4cCLS0tpEWzqqijwk78dtRsNJoJ9pt6pPGKLVStzH_AhJ8axRgAKxdtr4zct9qLZchMgMbtHeu_gVVFtsw1oywAsQUPxPFmkWxmKhm11QoA4soSCoiodokMVtydus0eM6-N9jmRnTyS3JjaswXF9CR9-3sZ6Qhf1ojcy_I36omxx8BL29YhkZxq-I7T-gA8SVkEW2I5nSfBbJtIG_tt2u5l0d73mrvmPJNWyLOlrNEYnE97_wYkbmzx7FB6LDmpWaS8wjPmr1A5AgEocZTYjbeoZqVGzc6L1i8FkNU6OumBHf9R99MW4qklaRwFSQu9s7e8ukvtmHcJA4JockK6LVPNLoQYuifnzo01GtUD5SczrnAj7sudre0rsO5ZMQ_EqmA0rHETrmp4blNax8K5ItkuIiKNUcKpV-Tz2q3Q79KKzpwkoW0_oLEnpqS7DLaaTA6VgfcUEkqOHoZua8AiQTGfoVG9YUFZU3Zob4zqvNmb63VK9DevIni6Tdl5XK6tZx83LOaUXjS_ZXhnGPkl_CS50idh-JjTlhgZCmpNPUSIDPJOdozfE2N151PWTgr3Qqhy381Ak7Ie3-RdDga1kjVQaQCK7w8Ahec6GBwHHsdaWjQSb2n7-kUP_YoJmE8HFBKpmKLo-joC514V2KVAfiqu-VIw.jkf-n6ivXOllB6gHhbFqmA","mac":"e4c5"},"shadow":{"0":{"zones":{"1":{"lockStatus":"0","currentTemp":"74","occupiedCool":"75","occupiedHeat":"70","unoccupiedCool":"95","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"1","zoneCall":"0","standaloneThermostat":"0","occupiedStatus":"0"},"2":{"lockStatus":"0","currentTemp":"74","occupiedCool":"75","occupiedHeat":"70","unoccupiedCool":"95","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"1","zoneCall":"0","standaloneThermostat":"0","occupiedStatus":"0"},"3":{"lockStatus":"0","currentTemp":"70","occupiedCool":"75","occupiedHeat":"70","unoccupiedCool":"95","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"0","zoneCall":"0","standaloneThermostat":"0","occupiedStatus":"0"},"4":{"lockStatus":"0","currentTemp":"75","occupiedCool":"83","occupiedHeat":"81","unoccupiedCool":"62","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"3","zoneCall":"3","standaloneThermostat":"0"},"5":{"lockStatus":"0","currentTemp":"75","occupiedCool":"83","occupiedHeat":"81","unoccupiedCool":"62","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"3","zoneCall":"3","standaloneThermostat":"0"},"6":{"lockStatus":"0","currentTemp":"75","occupiedCool":"83","occupiedHeat":"81","unoccupiedCool":"62","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"3","zoneCall":"3","standaloneThermostat":"0"},"7":{"lockStatus":"0","currentTemp":"75","occupiedCool":"83","occupiedHeat":"81","unoccupiedCool":"62","unoccupiedHeat":"60","mondayOccupiedHour":"6","mondayOccupiedMinute":"0","mondayOccupiedAmPm":"0","mondayUnoccupiedHour":"5","mondayUnoccupiedMinute":"0","mondayUnoccupiedAmPm":"1","tuesdayOccupiedHour":"6","tuesdayOccupiedMinute":"0","tuesdayOccupiedAmPm":"0","tuesdayUnoccupiedHour":"5","tuesdayUnoccupiedMinute":"0","tuesdayUnoccupiedAmPm":"1","wednesdayOccupiedHour":"6","wednesdayOccupiedMinute":"0","wednesdayOccupiedAmPm":"0","wednesdayUnoccupiedHour":"5","wednesdayUnoccupiedMinute":"0","wednesdayUnoccupiedAmPm":"1","thursdayOccupiedHour":"6","thursdayOccupiedMinute":"0","thursdayOccupiedAmPm":"0","thursdayUnoccupiedHour":"5","thursdayUnoccupiedMinute":"0","thursdayUnoccupiedAmPm":"1","fridayOccupiedHour":"6","fridayOccupiedMinute":"0","fridayOccupiedAmPm":"0","fridayUnoccupiedHour":"5","fridayUnoccupiedMinute":"0","fridayUnoccupiedAmPm":"1","saturdayOccupiedHour":"6","saturdayOccupiedMinute":"0","saturdayOccupiedAmPm":"0","saturdayUnoccupiedHour":"5","saturdayUnoccupiedMinute":"0","saturdayUnoccupiedAmPm":"1","sundayOccupiedHour":"6","sundayOccupiedMinute":"0","sundayOccupiedAmPm":"0","sundayUnoccupiedHour":"5","sundayUnoccupiedMinute":"0","sundayUnoccupiedAmPm":"1","zoneStatus":"3","zoneCall":"3","standaloneThermostat":"0"}},"diagnostics":{"leavingAir":"77","returnAir":"32","outsideAir":"32","errorCodeZone1":"3","errorCodeZone2":"3","errorCodeZone3":"1","errorCodeZone4":"1","errorCodeZone5":"1","errorCodeZone6":"1","errorCodeZone7":"1","errorCodeZone8":"1","errorCodeZone9":"1","errorCodeZone10":"1","errorCodeZone11":"1","errorCodeZone12":"1","errorCodeZone13":"1","errorCodeZone14":"1","errorCodeZone15":"1","errorCodeZone16":"1","errorCodeZone17":"1","errorCodeZone18":"1","errorCodeZone19":"1","errorCodeZone20":"1","systemStatus":"1"},"discover":{"rmCount":"0"}}}}');

const appReducer = (state = DEFAULT_STATE, action) => {
  switch(action.type) {
    case Actions.RECEIVE_USER_INFO:
      return receiveUserInfo(state, action);
    case Actions.RECEIVE_DEVICE_SHADOW_UPDATE:
      return receiveDeviceShadowUpdate(state, action);
    case Actions.SET_CONNECTED_STATUS:
      return setConnectedStatus(state, action);
    case Actions.UPDATE_ZONE:
      return updateZone(state, action);
    case Actions.UPDATE_VACATION_SCHEDULE:
      return updateVacation(state, action);
    case Actions.RESET_SHADOW:
      return resetDeviceShadow(state, action);
    default:
      return state;
  }
}

const receiveUserInfo = (state, action) => {
  return {
    ...state,
    user: {
      ...state.user,
      ...action.payload,
    }
  }
}

const receiveDeviceShadowUpdate = (state, action) => {
  const rawUpdatedShadowState = action.payload;
  const updatedShadowState = parseDeviceShadow(action.payload);
  const systemNumber = parseInt(updatedShadowState.systemNumber, 10);

  let newShadow;
  // Merge any new shadow updates with the currently known data.
  if (state.shadow[systemNumber]) {
    newShadow = {
      ...state.shadow,
      [systemNumber]: {
        ...state.shadow[systemNumber],
        zones: {
          ...state.shadow[systemNumber].zones,
          ...updatedShadowState.zones
        },
        diagnostics: {
          ...state.shadow[systemNumber].diagnostics,
          ...updatedShadowState.diagnostics,
        },
        discover: {
          ...state.shadow[systemNumber].discover,
          ...updatedShadowState.discover,
        },
				vacations: {
					...state.shadow[systemNumber].vacations,
					...updatedShadowState.vacations,
				},
        systemConfig: {
          ...state.shadow[systemNumber].systemConfig,
          ...updatedShadowState.systemConfig,
        },
      },
    };
  // If shadow data for a new system is being added for the first time,
  // we have no old data to merge with it.
  } else {
    newShadow = {
      ...state.shadow,
      [systemNumber]: {
        zones: {
          ...updatedShadowState.zones
        },
        diagnostics: {
          ...updatedShadowState.diagnostics,
        },
        discover: {
          ...updatedShadowState.discover,
				},
				vacations: {
					...updatedShadowState.vacations,
				},
        systemConfig: {
          ...updatedShadowState.systemConfig,
        },
      },
    };
  }

  return {
    ...state,
    rawShadow: {
      ...state.rawShadow,
      [systemNumber]: {
        ...state.rawShadow[systemNumber],
        ...rawUpdatedShadowState,
      }
    },
    shadow: newShadow,
  }
}

const setConnectedStatus = (state, action) => {
  return {
    ...state,
    connected: true,
  }
}

const updateZone = (state, action) => {
  const updateValue = action.payload.value;
  const updateAttribute = action.payload.updateAttribute;
  const updateZoneId = action.payload.zoneId;
  const currentSystemNumber = getCurrentSystemNumber();

  const updatedDeviceShadowState = {
    ...state.shadow,
    [currentSystemNumber]: {
      ...state.shadow[currentSystemNumber],
      zones: {
        ...state.shadow[currentSystemNumber].zones,
        [updateZoneId]: {
          ...state.shadow[currentSystemNumber].zones[updateZoneId],
          [updateAttribute]: updateValue,
        }
      }
    }
  };

  // Update the raw device shadow.
  const updatedRawShadow = updateRawDeviceShadow(
    state.rawShadow[currentSystemNumber], updatedDeviceShadowState[currentSystemNumber]);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowZoneUpdate(updatedRawShadow, currentSystemNumber, updateZoneId);

  // Optimistically update local state with changes while update to device shadow
  // is pending.
  return {
    ...state,
    rawShadow: {
      ...state.rawShadow,
      [currentSystemNumber]: updatedRawShadow,
    },
    shadow: updatedDeviceShadowState,
  }
}

const updateVacation = (state, action) => {
	const updateVacKey = action.payload.vacationKey;
	const updateStartDate = action.payload.dates[0];
	const updateEndDate = action.payload.dates[1];
	const currentSystemNumber = getCurrentSystemNumber();

	let updatedDeviceShadowState = {
		...state.shadow,
		[currentSystemNumber]: {
			...state.shadow[currentSystemNumber],
			vacations: {
				...state.shadow[currentSystemNumber].vacations,
				[updateVacKey]: {
					startDate: updateStartDate,
					endDate: updateEndDate
				}
			}
		}
	}
	if (updateStartDate.diff(updateEndDate,"days") === 0 && updateStartDate.format("M-D") === "1-1") {
		delete updatedDeviceShadowState[currentSystemNumber].vacations[updateVacKey];
	}

  // Update the raw device shadow.
  const updatedRawShadow = updateRawDeviceShadow(
    state.rawShadow[currentSystemNumber], updatedDeviceShadowState[currentSystemNumber]);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowVacationUpdate(updatedRawShadow, currentSystemNumber);

  // Optimistically update local state with changes while update to device shadow
  // is pending.
  return {
    ...state,
    rawShadow: {
      ...state.rawShadow,
      [currentSystemNumber]: updatedRawShadow,
    },
    shadow: updatedDeviceShadowState,
  }
}

const resetDeviceShadow = (state, action) => {
  let resetShadow = { ...DEFAULT_STATE };

  resetShadow.user = { ...state.user };
  resetShadow.connected = state.connected;

  return resetShadow;
}

export default appReducer
