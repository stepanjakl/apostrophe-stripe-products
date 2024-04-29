export default () => {
  apos.bus.$on('synchronize-stripe-products', async () => {
    try {
      await apos.http.post('/api/v1/stripe-products/synchronize', {
        body: {
          messages: {
            progress: apos.i18n.i18n[apos.i18n.locale].stripeProducts.synchronizeProductsNotificationProgressMessage,
            completed: apos.i18n.i18n[apos.i18n.locale].stripeProducts.synchronizeProductsNotificationCompletedMessage
          }
        }
      });
    } catch (error) {
      console.error(error);
    }
  });
};
